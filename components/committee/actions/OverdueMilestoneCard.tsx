'use client';

import type { OverdueMilestone, OverdueMilestoneState } from '@/demo/committee-demo';
import { AlertCircle, AlertTriangle, ExternalLink, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

type OverdueMilestoneCardProps = {
  milestone: OverdueMilestone;
  /**
   * Fired when the committee member clicks `Issue Warning`. The page is
   * expected to open the warning composer modal / contract call from here.
   */
  onIssueWarning?: (milestoneId: string) => void;
  /**
   * Fired only once the slash button is unlocked (24h after the warning).
   * Locked clicks are intercepted by the card and never bubble.
   */
  onSlash?: (milestoneId: string) => void;
};

const TOOLTIP_LOCKED_NO_WARNING =
  'A 24-hour warning attestation is required before slashing.';

/**
 * Single row in the "Action Required: Overdue" section.
 *
 * Each card has two distinct halves:
 *  - **Metadata strip** — grant title + ID, milestone position, stream amount,
 *    deadline cell with the red OVERDUE badge overlay.
 *  - **Status callout** — substate-specific banner explaining what's needed
 *    plus the action buttons. The `Slash` button is *always* visible so the
 *    due-process gating is impossible to miss; it's just disabled until a
 *    warning attestation has aged 24h.
 */
export default function OverdueMilestoneCard({
  milestone,
  onIssueWarning,
  onSlash,
}: OverdueMilestoneCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <MetadataStrip milestone={milestone} />
      <StatusCallout
        milestone={milestone}
        onIssueWarning={onIssueWarning}
        onSlash={onSlash}
      />
    </article>
  );
}

/* -------------------------- Metadata strip -------------------------- */

function MetadataStrip({ milestone }: { milestone: OverdueMilestone }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 pt-5 sm:grid-cols-4 sm:px-6">
      <MetaCell
        label="Grant"
        primary={milestone.grantTitle}
        primaryClassName="font-semibold text-blue-600"
        secondary={`ID: ${milestone.grantId}`}
      />
      <MetaCell
        label="Milestone"
        primary={milestone.milestoneTitle}
        secondary={`Milestone ${milestone.milestoneIndex} of ${milestone.totalMilestones}`}
      />
      <MetaCell
        label="Stream Amount"
        primary={`${formatTokenAmount(milestone.amount.value)} ${milestone.amount.token}`}
        primaryClassName="font-mono tabular-nums"
        secondary={
          milestone.paymentMode === 'superfluid' ? 'Superfluid Flow' : 'Lump-sum'
        }
      />
      <DeadlineCell deadlineIso={milestone.deadlineIso} />
    </div>
  );
}

function MetaCell({
  label,
  primary,
  primaryClassName,
  secondary,
}: {
  label: string;
  primary: string;
  primaryClassName?: string;
  secondary?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold text-slate-900 ${primaryClassName ?? ''}`}
      >
        {primary}
      </p>
      {secondary ? (
        <p className="mt-0.5 truncate text-xs text-slate-500">{secondary}</p>
      ) : null}
    </div>
  );
}

function DeadlineCell({ deadlineIso }: { deadlineIso: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Deadline
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">
          {formatDeadline(deadlineIso)}
        </p>
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">
          <AlertCircle className="h-3 w-3" strokeWidth={2.6} aria-hidden />
          Overdue
        </span>
      </div>
    </div>
  );
}

/* -------------------------- Status callout -------------------------- */

function StatusCallout({
  milestone,
  onIssueWarning,
  onSlash,
}: {
  milestone: OverdueMilestone;
  onIssueWarning?: (milestoneId: string) => void;
  onSlash?: (milestoneId: string) => void;
}) {
  switch (milestone.state.kind) {
    case 'deadline_missed':
      return (
        <DeadlineMissedCallout
          onIssueWarning={() => onIssueWarning?.(milestone.id)}
        />
      );
    case 'warning_issued':
      return (
        <WarningIssuedCallout
          state={milestone.state}
          onSlash={onSlash ? () => onSlash(milestone.id) : undefined}
        />
      );
    case 'slash_available':
      return (
        <SlashAvailableCallout
          state={milestone.state}
          onSlash={onSlash ? () => onSlash(milestone.id) : undefined}
        />
      );
    case 'slashed':
      // Slashed milestones are terminal and filtered out of the dashboard
      // list upstream — this branch only fires defensively if a slashed
      // milestone ever leaks through, in which case rendering nothing is
      // preferable to surfacing stale action buttons.
      return null;
  }
}

function DeadlineMissedCallout({ onIssueWarning }: { onIssueWarning: () => void }) {
  return (
    <div className="mt-5 border-t border-slate-100 bg-red-50/50 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <AlertCircle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-900">Milestone Deadline Missed</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-red-800/85">
              This milestone is past its deadline and remains in a Pending state. Normal
              voting is disabled. You must issue a formal warning before slashing can be
              executed to recover funds.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onIssueWarning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <AlertTriangle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Issue Warning
          </button>
          <SlashButton
            disabled
            tooltip={TOOLTIP_LOCKED_NO_WARNING}
          />
        </div>
      </div>
    </div>
  );
}

function WarningIssuedCallout({
  state,
  onSlash,
}: {
  state: Extract<OverdueMilestoneState, { kind: 'warning_issued' }>;
  onSlash?: () => void;
}) {
  const remaining = useCountdown(state.slashUnlocksAtIso);
  const issuedLabel = formatIssuedLabel(state.warningIssuedAtIso);
  const tooltip = `Slash available in ${remaining.label}. ${TOOLTIP_LOCKED_NO_WARNING}`;

  return (
    <div className="mt-5 border-t border-slate-100 bg-amber-50/50 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Warning Issued &mdash; Countdown Active
            </p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-amber-900/80">
              A warning attestation was issued on {issuedLabel}. The builder has{' '}
              <span className="font-mono font-bold text-amber-900 tabular-nums">
                {remaining.label}
              </span>{' '}
              remaining to submit deliverables before slashing can be executed.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={state.attestationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View Attestation
          </a>
          <SlashButton
            disabled={!remaining.elapsed}
            tooltip={remaining.elapsed ? undefined : tooltip}
            onClick={remaining.elapsed ? onSlash : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function SlashAvailableCallout({
  state,
  onSlash,
}: {
  state: Extract<OverdueMilestoneState, { kind: 'slash_available' }>;
  onSlash?: () => void;
}) {
  return (
    <div className="mt-5 border-t border-slate-100 bg-red-50/50 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <AlertCircle className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-900">Warning Period Elapsed</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-red-800/85">
              24 hours have passed since the warning attestation was issued without a
              builder response. The slash transaction is now available.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={state.attestationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View Attestation
          </a>
          <SlashButton onClick={onSlash} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Slash button -------------------------- */

function SlashButton({
  disabled = false,
  tooltip,
  onClick,
}: {
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-disabled={disabled}
      aria-label={
        disabled
          ? `Slash (locked) — ${tooltip ?? TOOLTIP_LOCKED_NO_WARNING}`
          : 'Slash milestone'
      }
      className={
        disabled
          ? 'inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 shadow-sm'
          : 'inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700'
      }
    >
      <Zap className="h-4 w-4" strokeWidth={2.2} aria-hidden />
      Slash
    </button>
  );
}

/* -------------------------- Helpers -------------------------- */

function formatTokenAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDeadline(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatIssuedLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Returns a human-readable `Xh Ym` (or `Ym Zs`) countdown that ticks every minute. */
function useCountdown(targetIso: string) {
  const compute = () => remainingFromNow(targetIso);
  const [snapshot, setSnapshot] = useState(compute);

  useEffect(() => {
    if (snapshot.elapsed) return;
    const interval = window.setInterval(() => {
      setSnapshot(compute());
    }, 60_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso, snapshot.elapsed]);

  return snapshot;
}

function remainingFromNow(targetIso: string): { elapsed: boolean; label: string } {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { elapsed: false, label: '—' };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { elapsed: true, label: '0m' };

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return { elapsed: false, label: `${hours}h ${minutes}m` };
  return { elapsed: false, label: `${minutes}m` };
}
