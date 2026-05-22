'use client';

import type { OverdueMilestoneState } from '@/demo/committee-demo';
import { buildArbiscanTxUrl } from '@/lib/slash-flow';
import { ExternalLink, Zap } from 'lucide-react';

type SlashedBadgeProps = {
  state: Extract<OverdueMilestoneState, { kind: 'slashed' }>;
};

/**
 * Terminal state shown after `GrantEscrow.slash(...)` is confirmed onchain.
 *
 * Per the PRD, the milestone panel collapses into a permanent black badge:
 * "SLASHED" pill, amount returned to treasury, slash timestamp, tx link.
 * Crucially, no actionable controls remain — the milestone is closed
 * forever. The activity timeline above continues to render so the audit
 * trail (deadline missed → warning issued → slashed) is intact.
 */
export default function SlashedBadge({ state }: SlashedBadgeProps) {
  return (
    <section
      role="status"
      aria-label="Milestone slashed onchain"
      className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]"
    >
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 ring-1 ring-red-500/40">
              <Zap className="h-3 w-3" strokeWidth={2.6} aria-hidden />
              Slashed
            </span>
            <h2 className="mt-3 text-xl font-bold tracking-tight">
              Milestone Slashed Onchain
            </h2>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              The escrowed funds were returned to the treasury and this milestone is
              permanently closed. No further committee actions are available.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Returned to Treasury
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">
              {formatUsd(state.amountReturnedUsdc)}{' '}
              <span className="text-sm font-semibold text-slate-400">USDC</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Slash Timestamp
            </p>
            <p className="mt-1 font-mono text-xs text-slate-300 tabular-nums">
              {formatUtcTimestamp(state.slashedAtIso)}
            </p>
          </div>
          <a
            href={buildArbiscanTxUrl(state.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            View on Arbiscan
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
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
