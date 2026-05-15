'use client';

import type { MyGrantRecord } from '@/lib/my-grants/types';
import { formatUsdcAmount } from '@/lib/my-grants/utils';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type MyGrantsTimelineProps = {
  grants: MyGrantRecord[];
};

function barColor(status: MyGrantRecord['finalStatus']): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500';
    case 'Active':
      return 'bg-sky-500';
    case 'Partially Slashed':
    case 'Fully Slashed':
      return 'bg-red-500';
    case 'Warning Issued':
      return 'bg-amber-400';
    default:
      return 'bg-slate-400';
  }
}

export default function MyGrantsTimeline({ grants }: MyGrantsTimelineProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const { minMs, maxMs, span } = useMemo(() => {
    if (grants.length === 0) {
      const now = Date.now();
      return { minMs: now, maxMs: now, span: 1 };
    }
    const min = Math.min(...grants.map((g) => g.createdAtMs));
    const max = Math.max(...grants.map((g) => g.finalDeadlineMs), Date.now());
    return { minMs: min, maxMs: max, span: Math.max(max - min, 1) };
  }, [grants]);

  const pct = (ms: number) => ((ms - minMs) / span) * 100;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex">
        <div className="w-28 shrink-0 border-r border-slate-100 bg-slate-50 py-4 pr-2">
          {grants.map((g) => (
            <div
              key={g.key}
              className="flex h-12 items-center justify-end truncate px-2 font-mono text-[10px] font-semibold text-slate-600"
              title={g.grantId}
            >
              {g.grantId}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div className="min-w-[640px] p-4">
            <div className="mb-3 flex justify-between text-[10px] font-medium text-slate-500">
              <span>{new Date(minMs).toLocaleDateString()}</span>
              <span>Today</span>
            </div>
            <div className="space-y-3">
              {grants.map((g) => {
                const left = pct(g.createdAtMs);
                const width = Math.max(pct(g.finalDeadlineMs) - left, 4);
                const isHover = hovered === g.key;
                return (
                  <div key={g.key} className="relative h-12">
                    <button
                      type="button"
                      className={`absolute top-3 h-6 rounded-md transition hover:opacity-90 ${barColor(g.finalStatus)} ${isHover ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onMouseEnter={() => setHovered(g.key)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(g.key)}
                      onBlur={() => setHovered(null)}
                      onClick={() => router.push(`/grants/${g.pathSegment}`)}
                      aria-label={`${g.grantId} ${g.finalStatus}`}
                    >
                      {g.milestones.map((m, i) => {
                        const dotLeft =
                          g.milestones.length <= 1
                            ? 50
                            : (i / (g.milestones.length - 1)) * 100;
                        return (
                          <span
                            key={m.index}
                            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-white bg-white/90"
                            style={{ left: `${dotLeft}%` }}
                            aria-hidden
                          />
                        );
                      })}
                    </button>
                    {isHover ? (
                      <div
                        className="pointer-events-none absolute left-1/2 top-0 z-10 w-48 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg"
                        role="tooltip"
                      >
                        <p className="font-bold text-slate-900">{g.grantId}</p>
                        <p className="text-slate-600">{g.finalStatus}</p>
                        <p className="tabular-nums text-slate-700">
                          ${formatUsdcAmount(g.releasedUsdc)} / ${formatUsdcAmount(g.totalUsdc)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-6 rounded bg-emerald-500" /> Completed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-6 rounded bg-sky-500" /> Active
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-6 rounded bg-red-500" /> Slashed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-6 rounded bg-amber-400" /> Warning
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
