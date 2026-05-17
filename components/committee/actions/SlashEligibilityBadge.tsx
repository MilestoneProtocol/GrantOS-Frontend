'use client';

import { useSlashEligibility, formatTimeRemaining } from '@/hooks/useSlashEligibility';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface SlashEligibilityBadgeProps {
  grantId: number;
  milestoneIndex: number;
  className?: string;
}

/**
 * Real-time badge showing slash eligibility status.
 * Automatically refreshes every 10 seconds.
 */
export function SlashEligibilityBadge({
  grantId,
  milestoneIndex,
  className = '',
}: SlashEligibilityBadgeProps) {
  const eligibility = useSlashEligibility(grantId, milestoneIndex);

  if (!eligibility) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        Checking...
      </div>
    );
  }

  if (!eligibility.hasWarning) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 ${className}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        No Warning Issued
      </div>
    );
  }

  if (eligibility.canSlash) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 ${className}`}>
        <CheckCircle className="h-3.5 w-3.5" />
        Slash Available
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 ${className}`}>
      <Clock className="h-3.5 w-3.5" />
      {formatTimeRemaining(eligibility.timeUntilSlash)} remaining
    </div>
  );
}

interface SlashEligibilityDetailsProps {
  grantId: number;
  milestoneIndex: number;
}

/**
 * Detailed slash eligibility information panel.
 */
export function SlashEligibilityDetails({
  grantId,
  milestoneIndex,
}: SlashEligibilityDetailsProps) {
  const eligibility = useSlashEligibility(grantId, milestoneIndex);

  if (!eligibility) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Loading eligibility status...</p>
      </div>
    );
  }

  if (!eligibility.hasWarning) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">No Warning Issued</h4>
            <p className="mt-1 text-sm text-red-700">
              A warning must be issued before this milestone can be slashed.
              The builder will have 24 hours to respond after the warning is issued.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (eligibility.canSlash) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">Slash Available</h4>
            <p className="mt-1 text-sm text-green-700">
              24 hours have passed since the warning was issued. You can now execute the slash transaction.
            </p>
            {eligibility.warningIssuedAt && (
              <p className="mt-2 text-xs text-green-600">
                Warning issued: {eligibility.warningIssuedAt.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900">Cooldown Period Active</h4>
          <p className="mt-1 text-sm text-amber-700">
            The builder has {formatTimeRemaining(eligibility.timeUntilSlash)} remaining to respond to the warning.
            Slash will be available after the cooldown period expires.
          </p>
          {eligibility.warningIssuedAt && eligibility.slashUnlocksAt && (
            <div className="mt-3 space-y-1 text-xs text-amber-600">
              <p>Warning issued: {eligibility.warningIssuedAt.toLocaleString()}</p>
              <p>Slash unlocks: {eligibility.slashUnlocksAt.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
