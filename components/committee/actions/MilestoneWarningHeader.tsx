'use client';

import type { OverdueMilestone } from '@/demo/committee-demo';
import { Copy } from 'lucide-react';
import { useCallback, useState } from 'react';

type MilestoneWarningHeaderProps = {
  milestone: OverdueMilestone;
};

/**
 * Hero card at the top of the Warning Issuance screen state. Mirrors the
 * design's milestone header: bold title with red OVERDUE pill, a short
 * intervention summary, the live escrow balance, and a 4-column metadata
 * strip (builder, due date, stream rate, grant ID).
 */
export default function MilestoneWarningHeader({ milestone }: MilestoneWarningHeaderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
              {milestone.grantTitle} &mdash; Milestone {milestone.milestoneIndex}
            </h1>
            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-red-700">
              Overdue
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Builder has missed the delivery deadline by {milestone.daysOverdue} days.
            Committee intervention required to assess slashing or extension.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Escrow Balance
          </p>
          <p className="mt-1 inline-flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            <span aria-hidden className="text-blue-500">
              <DiamondIcon />
            </span>
            {formatUsd(milestone.escrowBalanceUsdc)}{' '}
            <span className="text-sm font-semibold text-slate-500">USDC</span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
        <BuilderAddressCell address={milestone.builderAddress} />
        <MetaCell label="Due Date" value={formatDate(milestone.deadlineIso)} />
        <MetaCell
          label="Stream Rate"
          value={
            milestone.streamRateLabel ?? `${formatUsd(milestone.amount.value)} USDC (Lump-sum)`
          }
        />
        <MetaCell label="Grant ID" value={milestone.grantId} valueClassName="font-mono" />
      </div>
    </section>
  );
}

/* ---------------------------- Subcomponents ---------------------------- */

function MetaCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold text-slate-900 ${valueClassName ?? ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function BuilderAddressCell({ address }: { address: `0x${string}` }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can reject on insecure contexts; the copy icon is
      // purely a convenience so we silently no-op rather than alert.
    }
  }, [address]);

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Builder Address
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="truncate font-mono text-sm font-semibold text-blue-600">
          {shortenAddress(address)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied builder address' : 'Copy builder address'}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function DiamondIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M7 0L14 7L7 14L0 7L7 0Z" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortenAddress(addr: `0x${string}`) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}
