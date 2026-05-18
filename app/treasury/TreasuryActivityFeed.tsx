'use client';

import type { TreasuryActivityFilter, TreasuryEvent } from '@/lib/treasury';
import { grantDetailPath } from '@/lib/grant-routes';
import { filterEventsByRange, formatRelative, formatUsd } from '@/lib/treasury';
import { useTreasuryStore } from '@/store/treasuryStore';
import {
  CheckCircle2,
  Coins,
  Download,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  ShieldX,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

type Props = {
  events: TreasuryEvent[];
};

const FILTERS: { id: TreasuryActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'locked', label: 'Locked' },
  { id: 'released', label: 'Released' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'slashed', label: 'Slashed' },
];

const KIND_STYLES: Record<
  TreasuryEvent['kind'],
  { Icon: typeof Coins; bg: string; fg: string; label: string }
> = {
  grant_created: {
    Icon: Coins,
    bg: 'bg-sky-50',
    fg: 'text-sky-600',
    label: 'Grant Created',
  },
  milestone_approved: {
    Icon: CheckCircle2,
    bg: 'bg-emerald-50',
    fg: 'text-emerald-600',
    label: 'Milestone Released',
  },
  stream_started: {
    Icon: PlayCircle,
    bg: 'bg-teal-50',
    fg: 'text-teal-600',
    label: 'Stream Started',
  },
  stream_cancelled: {
    Icon: PauseCircle,
    bg: 'bg-orange-50',
    fg: 'text-orange-600',
    label: 'Stream Cancelled',
  },
  milestone_slashed: {
    Icon: ShieldX,
    bg: 'bg-rose-50',
    fg: 'text-rose-600',
    label: 'Funds Slashed',
  },
};

function kindMatchesFilter(kind: TreasuryEvent['kind'], filter: TreasuryActivityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'locked') return kind === 'grant_created';
  if (filter === 'released') return kind === 'milestone_approved';
  if (filter === 'streaming') return kind === 'stream_started' || kind === 'stream_cancelled';
  if (filter === 'slashed') return kind === 'milestone_slashed';
  return true;
}

function toCsv(rows: TreasuryEvent[]): string {
  const header = ['Timestamp', 'Type', 'Description', 'Grant ID', 'USDC Amount', 'Tx Hash', 'Tx URL'];
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const body = rows.map((r) => {
    const ts = new Date(r.timestampMs).toISOString();
    return [
      ts,
      KIND_STYLES[r.kind].label,
      r.description,
      r.grantId,
      r.amountUsdc.toString(),
      r.txHash,
      r.txUrl,
    ]
      .map(escape)
      .join(',');
  });
  return [header.join(','), ...body].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Full-width chronological event feed. Filter pills + native CSV export.
 * Time range comes from the global treasury store so toggling 7D/30D/etc.
 * scopes the feed alongside every other chart on the page.
 */
export default function TreasuryActivityFeed({ events }: Props) {
  const range = useTreasuryStore((s) => s.range);
  const filter = useTreasuryStore((s) => s.activityFilter);
  const setFilter = useTreasuryStore((s) => s.setActivityFilter);

  const filtered = useMemo(() => {
    const inWindow = filterEventsByRange(events, range);
    return inWindow.filter((e) => kindMatchesFilter(e.kind, filter));
  }, [events, range, filter]);

  const onExport = () => {
    const csv = toCsv(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`treasury-activity-${stamp}.csv`, csv);
  };

  return (
    <section
      aria-label="Treasury activity"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Treasury Activity
          </h2>
          <p className="text-xs text-slate-500">
            {filtered.length} event{filtered.length === 1 ? '' : 's'} in selected range
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          CSV
        </button>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-3 sm:px-6">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              filter === f.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-slate-500">
            No activity in this window.
          </li>
        ) : (
          filtered.map((evt) => <ActivityRow key={evt.id} evt={evt} />)
        )}
      </ul>
    </section>
  );
}

function ActivityRow({ evt }: { evt: TreasuryEvent }) {
  const style = KIND_STYLES[evt.kind];
  const Icon = style.Icon;
  const showAmount =
    evt.kind === 'grant_created' ||
    evt.kind === 'milestone_approved' ||
    evt.kind === 'milestone_slashed';
  const amountTone = (() => {
    if (evt.kind === 'milestone_approved') return 'text-emerald-600';
    if (evt.kind === 'milestone_slashed') return 'text-rose-600';
    if (evt.kind === 'grant_created') return 'text-slate-700';
    return 'text-slate-700';
  })();
  const amountLabel = (() => {
    if (evt.kind === 'milestone_slashed') return formatUsd(-evt.amountUsdc, { sign: true });
    return formatUsd(evt.amountUsdc, { sign: true });
  })();

  return (
    <li className="px-4 py-3 sm:px-6">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.fg}`}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-slate-900">{style.label}</p>
            <Link
              href={grantDetailPath(evt.pathSegment, 'treasury')}
              className="text-sm font-semibold text-sky-600 hover:underline"
            >
              {evt.grantId}
            </Link>
          </div>
          <p className="text-[11px] text-slate-500">{formatRelative(evt.timestampMs)}</p>
        </div>
        <div className="text-right">
          {showAmount ? (
            <p className={`text-sm font-bold tabular-nums ${amountTone}`}>{amountLabel}</p>
          ) : (
            <p className="text-xs text-slate-500">—</p>
          )}
          <Link
            href={evt.txUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open transaction ${evt.txHash} on Arbiscan`}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-600"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Tx
          </Link>
        </div>
      </div>
    </li>
  );
}
