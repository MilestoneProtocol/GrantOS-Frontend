'use client';

import type { BuilderWarningRecord } from '@/lib/builder-warnings';
import { AlertTriangle, Clock, ShieldX, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type WarningDetailCardProps = {
  record: BuilderWarningRecord;
};

/**
 * Top card on the Warning Detail page. Shows the warning's "what / who /
 * when / how much" in a single read-only surface:
 *  - Title + lifecycle status pill (Warning Issued / Slashed).
 *  - The milestone the warning targets.
 *  - The committee member's verbatim message (shaded quote block).
 *  - Meta grid: issued-by address, warning timestamp, USDC at risk /
 *    returned, and either the slash execution time (post-slash) or the
 *    live countdown to slash eligibility (pre-slash).
 *
 * Layout is responsive: meta grid is 2 columns on tablets+, single column
 * on mobile. The card is intentionally non-interactive — per the PRD the
 * Warning Detail page is purely informational.
 */
export default function WarningDetailCard({ record }: WarningDetailCardProps) {
  const isSlashed = Boolean(record.slash);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isSlashed ? 'bg-slate-900 text-white' : 'bg-red-100 text-red-600'
              }`}
            >
              {isSlashed ? (
                <ShieldX className="h-5 w-5" strokeWidth={2.2} />
              ) : (
                <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
                Milestone Warning
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Milestone #{record.milestoneIndex}:{' '}
                <span className="font-medium text-slate-700">
                  {record.milestoneTitle}
                </span>
              </p>
            </div>
          </div>

          <StatusPill isSlashed={isSlashed} />
        </div>
      </header>

      <section className="mt-6 px-6 sm:px-8">
        <CommitteeNote message={record.message} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 px-6 pb-7 sm:grid-cols-2 sm:px-8 sm:pb-8">
        <MetaBlock label="Issued By">
          <IssuedByValue
            address={record.committeeMemberAddress}
            label={record.committeeMemberLabel}
          />
        </MetaBlock>

        <MetaBlock
          label={isSlashed ? 'Funds Slashed' : 'Funds at Risk'}
          tone={isSlashed ? 'danger' : 'neutral'}
        >
          <AmountValue
            usdc={
              isSlashed
                ? record.slash!.amountReturnedUsdc
                : record.amountAtRiskUsdc
            }
            tone={isSlashed ? 'danger' : 'neutral'}
          />
        </MetaBlock>

        <MetaBlock label="Warning Timestamp">
          <TimestampValue iso={record.warningIssuedAtIso} />
        </MetaBlock>

        <MetaBlock
          label={isSlashed ? 'Slash Execution Time' : 'Slash Unlocks In'}
        >
          {isSlashed ? (
            <DigitalTimestamp iso={record.slash!.slashedAtIso} />
          ) : (
            <CountdownValue targetIso={record.slashUnlocksAtIso} />
          )}
        </MetaBlock>
      </section>
    </article>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function StatusPill({ isSlashed }: { isSlashed: boolean }) {
  if (isSlashed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 ring-1 ring-inset ring-red-200">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Slashed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-inset ring-amber-200">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Warning Issued
    </span>
  );
}

function CommitteeNote({ message }: { message: string }) {
  return (
    <div className="relative rounded-xl border border-red-100 bg-red-50/40 px-5 py-4 sm:px-6 sm:py-5">
      <span
        aria-hidden
        className="absolute inset-y-3 left-2 w-1 rounded-full bg-red-400/80"
      />
      <p className="pl-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
        Committee Note
      </p>
      <blockquote className="pl-3 mt-1.5 text-sm italic leading-relaxed text-slate-700">
        &ldquo;{message}&rdquo;
      </blockquote>
    </div>
  );
}

function MetaBlock({
  label,
  tone = 'neutral',
  children,
}: {
  label: string;
  tone?: 'neutral' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
          tone === 'danger' ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function IssuedByValue({
  address,
  label,
}: {
  address: `0x${string}`;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-white"
      >
        <User className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-medium text-slate-900">
        <span className="font-mono">{truncateAddress(address)}</span>
        {label ? (
          <span className="ml-1 font-medium text-slate-500">({label})</span>
        ) : null}
      </span>
    </div>
  );
}

function AmountValue({
  usdc,
  tone,
}: {
  usdc: number;
  tone: 'neutral' | 'danger';
}) {
  return (
    <p
      className={`text-2xl font-bold tabular-nums tracking-tight ${
        tone === 'danger' ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      {formatUsd(usdc)}{' '}
      <span className="text-base font-semibold text-slate-400">USDC</span>
    </p>
  );
}

function TimestampValue({ iso }: { iso: string }) {
  return (
    <p className="text-sm font-medium text-slate-700">{formatDateTime(iso)}</p>
  );
}

/**
 * Renders the slashed-at timestamp in a code-style chip — matches the
 * design's monospaced "log line" treatment.
 */
function DigitalTimestamp({ iso }: { iso: string }) {
  return (
    <p className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold text-slate-100 shadow-sm">
      {formatDateTimeMonoSpaced(iso)}
    </p>
  );
}

function CountdownValue({ targetIso }: { targetIso: string }) {
  const snapshot = useSecondCountdown(targetIso);

  if (snapshot.elapsed) {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-700">
        <Clock className="h-3 w-3" />
        Slash window open
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold text-slate-100 tabular-nums shadow-sm">
      <Clock className="h-3 w-3 text-slate-400" />
      {snapshot.label}
    </p>
  );
}

/* ------------------------------ Helpers ------------------------------ */

type CountdownSnapshot = { elapsed: boolean; label: string };

function useSecondCountdown(targetIso: string): CountdownSnapshot {
  const initial = useMemo<CountdownSnapshot>(
    () => ({ elapsed: false, label: 'Loading…' }),
    [],
  );
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(initial);

  useEffect(() => {
    const compute = () => setSnapshot(remainingFromNow(targetIso));
    compute();
    if (snapshot.elapsed) return;
    const interval = window.setInterval(compute, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  return snapshot;
}

function remainingFromNow(targetIso: string): CountdownSnapshot {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { elapsed: false, label: '—' };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { elapsed: true, label: '00h 00m 00s' };

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return { elapsed: false, label: `${hours}h ${minutes}m ${seconds}s` };
}

function truncateAddress(addr: `0x${string}`): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Same formatter the design uses: `Mon DD, YYYY • HH:MM UTC`. */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${datePart} • ${timePart} UTC`;
}

function formatDateTimeMonoSpaced(iso: string): string {
  // Same content as `formatDateTime` — separate fn to keep mono spacing
  // logic centralised in case it needs to diverge later.
  return formatDateTime(iso);
}
