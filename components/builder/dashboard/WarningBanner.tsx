'use client';

import type { BuilderWarningRecord } from '@/lib/builder-warnings';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type WarningBannerProps = {
  warning: BuilderWarningRecord;
};

/**
 * Builder-facing warning banner (US-04 step 2). Renders at the top of the
 * dashboard for every active warning targeting the connected wallet.
 *
 * The banner is intentionally non-dismissable per the PRD — the builder
 * needs to see the consequences of the warning every time they load the
 * dashboard until they either deliver the milestone (committee re-reviews)
 * or the 24h cool-off elapses and the slash is executed.
 *
 * Per-second countdown derives from `warningIssuedAt + 24h - Date.now()`,
 * matching the exact computation `GrantEscrow.slash` uses on chain — when
 * the label flips to "Slash window open" the builder knows the committee
 * can execute the slash at any moment.
 */
export default function WarningBanner({ warning }: WarningBannerProps) {
  const remaining = useSecondCountdown(warning.slashUnlocksAtIso);
  const truncatedCommittee = truncateAddress(warning.committeeMemberAddress);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-red-200 bg-red-50/60 shadow-sm"
    >
      <div className="flex items-stretch">
        <span aria-hidden className="w-1 shrink-0 bg-red-500" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-900">
                  Warning Issued: {warning.milestoneTitle}
                </p>
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  Grant {warning.grantId}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                Committee member{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {truncatedCommittee}
                </span>{' '}
                has issued a warning regarding the recent milestone submission.{' '}
                <span className="text-slate-600">
                  &ldquo;{warning.message}&rdquo;
                </span>
              </p>
              <Link
                href={buildWarningDetailHref(warning.grantId, warning.milestoneId)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-700"
              >
                View Warning Details &rarr;
              </Link>
            </div>
          </div>

          <CountdownPill remaining={remaining} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function CountdownPill({ remaining }: { remaining: CountdownSnapshot }) {
  if (remaining.elapsed) {
    return (
      <span
        role="timer"
        aria-live="off"
        className="inline-flex items-center gap-1.5 self-start rounded-md border border-red-300 bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 shadow-sm"
      >
        <Clock className="h-3 w-3" strokeWidth={2.4} aria-hidden />
        Slash window open
      </span>
    );
  }
  return (
    <span
      role="timer"
      aria-live="off"
      className="inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 shadow-sm tabular-nums"
    >
      <Clock className="h-3 w-3" aria-hidden />
      Slash possible in {remaining.label}
    </span>
  );
}

/* ------------------------------ Helpers ------------------------------ */

type CountdownSnapshot = { elapsed: boolean; label: string };

function useSecondCountdown(targetIso: string): CountdownSnapshot {
  const compute = () => remainingFromNow(targetIso);
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(compute);

  useEffect(() => {
    if (snapshot.elapsed) return;
    const interval = window.setInterval(() => {
      setSnapshot(compute());
    }, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso, snapshot.elapsed]);

  return snapshot;
}

function remainingFromNow(targetIso: string): CountdownSnapshot {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { elapsed: false, label: '—' };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { elapsed: true, label: '0h 0m 0s' };

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { elapsed: false, label: `${hours}h ${minutes}m ${seconds}s` };
}

function truncateAddress(addr: `0x${string}`): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

/**
 * Build the deep-link to the Warning Detail page. The route is keyed by
 * grant id + milestone id; both segments are URL-encoded because the demo
 * uses formatted ids like `#GRT-8921` and `overdue-defi-m2`.
 */
function buildWarningDetailHref(grantId: string, milestoneId: string): string {
  return `/grants/${encodeURIComponent(grantId)}/milestones/${encodeURIComponent(milestoneId)}/warning`;
}
