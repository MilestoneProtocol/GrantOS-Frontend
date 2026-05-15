'use client';

import type { MyGrantRecord } from '@/lib/my-grants/types';
import {
  computeStreamTotal,
  formatUsdcAmount,
  milestoneBadgeClass,
  statusBadgeClass,
} from '@/lib/my-grants/utils';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type MyGrantsGrantCardProps = {
  grant: MyGrantRecord;
  expanded: boolean;
  onToggle: () => void;
};

export default function MyGrantsGrantCard({ grant, expanded, onToggle }: MyGrantsGrantCardProps) {
  const [streamTotal, setStreamTotal] = useState(() => computeStreamTotal(grant));

  useEffect(() => {
    if (!grant.isStreamingActive) {
      setStreamTotal(grant.streamAccumulatedUsdcAtEpoch);
      return;
    }
    setStreamTotal(computeStreamTotal(grant));
    const id = window.setInterval(() => setStreamTotal(computeStreamTotal(grant)), 100);
    return () => window.clearInterval(id);
  }, [grant]);

  const pct =
    grant.milestonesTotal > 0
      ? Math.round((grant.milestonesCompleted / grant.milestonesTotal) * 100)
      : 0;
  const created = new Date(grant.createdAtMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                {grant.grantId}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {created}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(grant.finalStatus)}`}
              >
                {grant.finalStatus}
              </span>
              {grant.isStreamingActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Streaming
                </span>
              ) : null}
            </div>

            <h3 className="mt-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
              {grant.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {grant.daoName} · {grant.committeeCount} Committee Members
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-violet-500" />
                {grant.zkProofsSubmitted} ZK Proofs Submitted
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {grant.paymentLabel}
              </span>
            </div>

            {grant.isStreamingActive ? (
              <p className="mt-2 text-sm font-semibold tabular-nums text-emerald-600">
                Live stream: ${formatUsdcAmount(streamTotal)} ·{' '}
                {grant.streamRateUsdcPerSec.toFixed(4)} USDC/sec
              </p>
            ) : null}
          </div>

          <div className="w-full shrink-0 lg:w-56">
            <p className="text-xs text-slate-500">Total Value</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">
              ${formatUsdcAmount(grant.totalUsdc)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              ${formatUsdcAmount(grant.releasedUsdc)} of ${formatUsdcAmount(grant.totalUsdc)}{' '}
              released
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span>
                  Milestone {grant.milestonesCompleted}/{grant.milestonesTotal}
                </span>
                <span>{pct}% complete</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
                {grant.finalStatus === 'Active' && pct < 100 ? (
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.min(22, 100 - pct)}%` }}
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {expanded ? 'Collapse' : 'Expand'}
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <Link
                href={`/grants/${grant.pathSegment}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
              >
                View Grant
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Milestone</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Deadline</th>
                  <th className="px-2 py-2">Proof Type</th>
                </tr>
              </thead>
              <tbody>
                {grant.milestones.map((m) => (
                  <tr key={m.index} className="border-t border-slate-100">
                    <td className="px-2 py-2.5 font-medium text-slate-900">
                      {m.index}. {m.title}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${milestoneBadgeClass(m.status)}`}
                      >
                        {m.status === 'streaming' ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Streaming
                          </span>
                        ) : (
                          m.status.replace('_', ' ')
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-slate-800">
                      ${formatUsdcAmount(m.amountUsdc)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {new Date(m.deadlineMs).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">{m.proofTypeLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </article>
  );
}
