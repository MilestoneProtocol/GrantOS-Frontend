'use client';

import type { DaoGrantCardModel } from '@/demo/dao-dashboard';
import { gradeTone, hoursUntil, letterGradeFromScore } from '@/demo/dao-dashboard';
import { BadgeCheck, Clock, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type DaoGrantCardProps = {
  grant: DaoGrantCardModel;
  onOpen: (grant: DaoGrantCardModel) => void;
};

function truncateAddress(addr: `0x${string}`): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

/**
 * Committee-facing grant summary card. Clicking anywhere opens the detail
 * drawer (placeholder until the next screen ships). Live Sablier ticker
 * updates every 100ms when `isStreamingActive` is true.
 */
export default function DaoGrantCard({ grant, onOpen }: DaoGrantCardProps) {
  const grade = letterGradeFromScore(grant.reputationScore);
  const tone = gradeTone(grant.reputationScore);
  const pct =
    grant.milestoneTotal > 0
      ? Math.round((100 * grant.milestoneCompleted) / grant.milestoneTotal)
      : 0;

  const urgentDeadline =
    grant.nextDeadlineIso != null &&
    hoursUntil(grant.nextDeadlineIso) > 0 &&
    hoursUntil(grant.nextDeadlineIso) <= 48;

  const [streamTotal, setStreamTotal] = useState(() => computeStreamTotal(grant));

  useEffect(() => {
    if (!grant.isStreamingActive) return;
    const id = window.setInterval(() => {
      setStreamTotal(computeStreamTotal(grant));
    }, 100);
    return () => window.clearInterval(id);
  }, [grant]);

  const gradeColor =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'amber'
        ? 'text-amber-600'
        : tone === 'orange'
          ? 'text-orange-600'
          : 'text-red-600';

  const barColor = grant.hasSlashed
    ? 'bg-red-500'
    : grant.hasWarning
      ? 'bg-amber-400'
      : 'bg-sky-500';

  return (
    <button
      type="button"
      onClick={() => onOpen(grant)}
      className="group w-full rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
    >
      <div className="border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
            {grant.displayId}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {grant.isStreamingActive ? (
              <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                Streaming
              </span>
            ) : null}
            {grant.hasWarning ? (
              <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                <span aria-hidden>⚠</span> Warning
              </span>
            ) : null}
            {grant.hasSlashed ? (
              <span className="inline-flex items-center rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Slashed
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              grant.hasSlashed ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <UserRound className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-semibold text-slate-800">
              {truncateAddress(grant.builder)}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {grant.zkVerified ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                  <BadgeCheck className="h-3 w-3" /> ZK
                </span>
              ) : null}
              <span className="text-[11px] font-medium text-slate-500">{grant.contributionTier}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Reputation</p>
          <p className={`text-sm font-bold tabular-nums ${gradeColor}`}>
            {grant.reputationScore}/100{' '}
            <span className="text-xs font-semibold">GRADE {grade}</span>
          </p>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>{grant.hasSlashed ? 'Milestone progress (halted)' : 'Milestone progress'}</span>
            <span className="tabular-nums text-slate-700">
              {grant.milestoneCompleted}/{grant.milestoneTotal}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {grant.nextDeadlineIso ? (
          <p
            className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${
              urgentDeadline ? 'text-red-600' : 'text-slate-600'
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Next deadline in {formatDeadlineRelative(grant.nextDeadlineIso)}
          </p>
        ) : grant.hasSlashed ? (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Funds recovered —{' '}
            <span className="text-sky-600 underline-offset-2 group-hover:underline">View tx</span>{' '}
            <span className="text-slate-400">(drawer)</span>
          </p>
        ) : null}

        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {grant.paymentMode === 'streaming' ? 'Sablier stream' : 'Lump sum'}
        </p>
      </div>

      {grant.isStreamingActive ? (
        <div className="flex items-center justify-between gap-3 bg-linear-to-r from-slate-900 to-sky-950 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-200/90">
              Live stream
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white sm:text-xl">
              $ {streamTotal.toFixed(6)}
            </p>
          </div>
          <p className="shrink-0 text-right font-mono text-[11px] font-medium text-sky-200/90">
            {grant.streamRateUsdcPerSec.toFixed(6)}
            <br />
            <span className="text-sky-300/80">USDC/sec</span>
          </p>
        </div>
      ) : null}
    </button>
  );
}

function computeStreamTotal(g: DaoGrantCardModel): number {
  const elapsedSec = (Date.now() - g.streamEpochMs) / 1000;
  return g.streamAccumulatedUsdcAtEpoch + elapsedSec * g.streamRateUsdcPerSec;
}

function formatDeadlineRelative(iso: string): string {
  const h = hoursUntil(iso);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} minutes`;
  if (h < 48) return `${Math.round(h)} hours`;
  return `${Math.round(h / 24)} days`;
}
