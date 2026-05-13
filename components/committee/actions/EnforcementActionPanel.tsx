'use client';

import type { OverdueMilestoneState } from '@/demo/committee-demo';
import { CheckCircle2, ExternalLink, ShieldAlert, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

type EnforcementActionPanelProps = {
  /** Only the `warning_issued` substate is rendered by this panel. */
  state: Extract<OverdueMilestoneState, { kind: 'warning_issued' }>;
};

/**
 * Post-warning waiting state on `/committee`.
 *
 * Replaces the `IssueWarningPanel` once the warning attestation has been
 * confirmed on-chain. The committee member is now in a passive 24h hold:
 *  - The warning is documented onchain (timestamp + EAS attestation link).
 *  - The Execute Slash button is permanently disabled until the countdown
 *    expires — at which point the page swaps this panel for the
 *    `slash_available` substate.
 *
 * The countdown ticks every second (PRD requirement) and is derived from
 * `warningTimestamp + 24h - Date.now()`, which is the exact computation the
 * `GrantEscrow` contract uses when verifying the slash transaction.
 */
export default function EnforcementActionPanel({ state }: EnforcementActionPanelProps) {
  const remaining = useSecondCountdown(state.slashUnlocksAtIso);
  const issuedLabel = formatUtcTimestamp(state.warningIssuedAtIso);
  const slashTooltip = `Slash available in ${remaining.label}.`;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 w-full bg-linear-to-r from-amber-400 via-amber-500 to-orange-400" />

      <header className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900">Enforcement Action</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            The warning attestation is recorded onchain. Slashing is locked for 24 hours
            from the warning timestamp.
          </p>
        </div>
      </header>

      <div className="grid gap-4 px-5 pb-5 pt-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
        <WarningIssuedCell
          issuedLabel={issuedLabel}
          attestationUrl={state.attestationUrl}
        />
        <SlashCountdownCell remaining={remaining} tooltip={slashTooltip} />
      </div>
    </section>
  );
}

/* ---------------------------- Sub-cells ---------------------------- */

function WarningIssuedCell({
  issuedLabel,
  attestationUrl,
}: {
  issuedLabel: string;
  attestationUrl: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-6 text-center">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-emerald-600 ring-4 ring-amber-50"
        aria-hidden
      >
        <CheckCircle2 className="h-6 w-6" strokeWidth={2.4} />
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
        Warning Issued
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.8} aria-hidden />
      </span>
      <p className="font-mono text-[11px] leading-relaxed text-slate-500 tabular-nums">
        {issuedLabel}
      </p>
      <a
        href={attestationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
      >
        <ExternalLink className="h-3 w-3" aria-hidden />
        View EAS Attestation
      </a>
    </div>
  );
}

function SlashCountdownCell({
  remaining,
  tooltip,
}: {
  remaining: CountdownSnapshot;
  tooltip: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-6 text-center">
      <button
        type="button"
        disabled
        aria-disabled
        title={tooltip}
        aria-label={`Execute Slash (locked). ${remaining.label} remaining before slashing is available.`}
        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm"
      >
        <Zap className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        Execute Slash
      </button>
      <p className="text-[11px] font-medium text-slate-500">Slash available in</p>
      <span
        role="timer"
        aria-live="off"
        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 shadow-sm"
      >
        {remaining.label}
      </span>
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */

type CountdownSnapshot = { elapsed: boolean; label: string };

/**
 * Per-second countdown to the slash-unlock timestamp.
 *
 * Why per-second (vs. the per-minute one used on dashboard cards): the PRD
 * specifies the countdown should tick every second on this screen so the
 * committee member can see exact remaining time. Once it elapses, the
 * snapshot's `elapsed` flag flips and the parent should swap this panel for
 * the `slash_available` substate.
 */
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

function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month} ${day}, ${year} · ${hh}:${mm} UTC`;
}
