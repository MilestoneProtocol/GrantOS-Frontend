'use client';

import type { StreamRow } from '@/lib/treasury';
import { formatDateShort, streamedTotal, truncateAddress } from '@/lib/treasury';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  streams: StreamRow[];
};

/**
 * Live Superfluid stream board. Total accumulated USDC ticks every 100ms
 * via `setInterval`, cleaned up on unmount per the PRD requirement.
 *
 * Returns null when there are no active streams so the section disappears
 * entirely from the layout.
 */
export default function StreamingOverviewPanel({ streams }: Props) {
  if (streams.length === 0) return null;

  return (
    <section
      aria-label="Live streams"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <CombinedHeader streams={streams} />
      <div className="divide-y divide-slate-100">
        {streams.map((s) => (
          <StreamRowItem key={s.grantId} stream={s} />
        ))}
      </div>
    </section>
  );
}

function CombinedHeader({ streams }: { streams: StreamRow[] }) {
  const totalRate = useMemo(
    () => streams.reduce((acc, s) => acc + s.flowRateUsdcPerSec, 0),
    [streams],
  );
  return (
    <header className="border-b border-slate-100 bg-sky-50/50 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
        <span className="relative inline-flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
        </span>
        Live Streams
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Streaming{' '}
        <span className="font-bold tabular-nums text-sky-700">
          {totalRate.toFixed(4)} USDC/sec
        </span>{' '}
        across {streams.length} {streams.length === 1 ? 'grant' : 'grants'}
      </p>
    </header>
  );
}

function StreamRowItem({ stream }: { stream: StreamRow }) {
  const [total, setTotal] = useState(() => streamedTotal(stream));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTotal(streamedTotal(stream));
    }, 100);
    return () => window.clearInterval(id);
  }, [stream]);

  return (
    <article className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span>{stream.grantId}</span>
          <span className="font-mono text-[11px] font-medium text-slate-400">
            {truncateAddress(stream.builder)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
          Accumulated
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
          {total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-[11px] font-medium uppercase text-slate-500">USDC</span>
        </p>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Flow rate</p>
        <p className="font-mono text-sm font-semibold tabular-nums text-sky-700">
          {stream.flowRateUsdcPerSec.toFixed(4)}{' '}
          <span className="text-[11px] font-medium uppercase text-slate-500">/ sec</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Started {formatDateShort(stream.startedAtMs)}
          {stream.nextDeadlineMs ? (
            <>
              {' · '}Next {formatDateShort(stream.nextDeadlineMs)}
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
