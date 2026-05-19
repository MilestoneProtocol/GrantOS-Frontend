'use client';

import { useEffect, useState } from 'react';
import { getWarningByMilestone } from '@/lib/warning-api';

export interface SlashEligibility {
  canSlash: boolean;
  hasWarning: boolean;
  warningAge: number; // in seconds
  timeUntilSlash: number; // in seconds, 0 if can slash
  warningIssuedAt: Date | null;
  slashUnlocksAt: Date | null;
}

const SLASH_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours

export function useSlashEligibility(
  grantId: number | undefined,
  milestoneIndex: number | undefined,
): SlashEligibility | null {
  const [eligibility, setEligibility] = useState<SlashEligibility | null>(null);

  useEffect(() => {
    if (grantId === undefined || milestoneIndex === undefined) {
      setEligibility(null);
      return;
    }

    let mounted = true;

    async function check() {
      try {
        const warning = await getWarningByMilestone(grantId!, milestoneIndex!);

        if (!mounted) return;

        if (!warning || warning.slashed) {
          setEligibility({
            canSlash: false,
            hasWarning: false,
            warningAge: 0,
            timeUntilSlash: 0,
            warningIssuedAt: null,
            slashUnlocksAt: null,
          });
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const warningTs = parseInt(warning.warningTimestamp, 10);
        const slashUnlocksTs = parseInt(warning.slashUnlocksAt, 10);
        const warningAge = now - warningTs;
        const timeUntilSlash = Math.max(0, slashUnlocksTs - now);

        setEligibility({
          canSlash: timeUntilSlash === 0,
          hasWarning: true,
          warningAge,
          timeUntilSlash,
          warningIssuedAt: new Date(warningTs * 1000),
          slashUnlocksAt: new Date(slashUnlocksTs * 1000),
        });
      } catch (err) {
        console.error('Failed to check slash eligibility:', err);
        if (mounted) {
          setEligibility({
            canSlash: false,
            hasWarning: false,
            warningAge: 0,
            timeUntilSlash: 0,
            warningIssuedAt: null,
            slashUnlocksAt: null,
          });
        }
      }
    }

    check();
    const interval = setInterval(check, 10000); // Refresh every 10s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [grantId, milestoneIndex]);

  return eligibility;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Now';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
