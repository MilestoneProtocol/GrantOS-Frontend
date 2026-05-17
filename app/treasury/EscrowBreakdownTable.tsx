'use client';

import { ZKVerifiedDot } from '@/app/treasury/ZKVerifiedDot';
import type { EscrowRisk, EscrowRow } from '@/lib/treasury';
import { grantDetailPath } from '@/lib/grant-routes';
import { formatDateShort, formatUsd, truncateAddress } from '@/lib/treasury';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

type SortKey =
  | 'grantId'
  | 'builder'
  | 'totalEscrowedUsdc'
  | 'releasedUsdc'
  | 'remainingUsdc'
  | 'paymentMode'
  | 'nextDeadlineMs'
  | 'riskLevel';

type SortDir = 'asc' | 'desc';

const RISK_ORDER: Record<EscrowRisk, number> = {
  healthy: 0,
  watch: 1,
  at_risk: 2,
  critical: 3,
};

const RISK_PILL: Record<EscrowRisk, { label: string; classes: string }> = {
  healthy: {
    label: 'Healthy',
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  watch: {
    label: 'Watch',
    classes: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  at_risk: {
    label: 'At Risk',
    classes: 'bg-orange-50 text-orange-700 ring-orange-200',
  },
  critical: {
    label: 'Critical',
    classes: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
};

const MODE_PILL = {
  streaming: { label: 'Stream', classes: 'bg-sky-50 text-sky-700 ring-sky-200' },
  lump_sum: { label: 'Milestone', classes: 'bg-slate-100 text-slate-700 ring-slate-200' },
} as const;

type Props = {
  rows: EscrowRow[];
};

const COLUMNS: { key: SortKey; label: string; align?: 'right' | 'left' }[] = [
  { key: 'grantId', label: 'Grant ID' },
  { key: 'builder', label: 'Builder' },
  { key: 'totalEscrowedUsdc', label: 'Escrowed', align: 'right' },
  { key: 'releasedUsdc', label: 'Released', align: 'right' },
  { key: 'remainingUsdc', label: 'Remaining', align: 'right' },
  { key: 'paymentMode', label: 'Mode' },
  { key: 'nextDeadlineMs', label: 'Next Deadline' },
  { key: 'riskLevel', label: 'Risk Level' },
];

const VIRTUAL_THRESHOLD = 50;
const ROW_HEIGHT = 56;

/**
 * Sortable + searchable escrow breakdown. Switches to virtual scrolling
 * once we exceed `VIRTUAL_THRESHOLD` rows, per the PRD.
 */
export default function EscrowBreakdownTable({ rows }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalEscrowedUsdc');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.grantId.toLowerCase().includes(q) ||
        r.builder.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'grantId':
          return a.grantId.localeCompare(b.grantId) * dir;
        case 'builder':
          return a.builder.localeCompare(b.builder) * dir;
        case 'paymentMode':
          return a.paymentMode.localeCompare(b.paymentMode) * dir;
        case 'riskLevel':
          return (RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]) * dir;
        case 'nextDeadlineMs': {
          const av = a.nextDeadlineMs ?? Number.POSITIVE_INFINITY;
          const bv = b.nextDeadlineMs ?? Number.POSITIVE_INFINITY;
          return (av - bv) * dir;
        }
        default:
          return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
      }
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <section
      aria-label="Escrow breakdown"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Escrow Breakdown
          </h2>
          <p className="text-xs text-slate-500">
            {sorted.length} of {rows.length} active grants
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search by grant id or address</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID or Address…"
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </header>

      {sorted.length > VIRTUAL_THRESHOLD ? (
        <VirtualBody
          rows={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onOpen={(segment) => router.push(grantDetailPath(segment, 'treasury'))}
        />
      ) : (
        <ScrollableBody
          rows={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onOpen={(segment) => router.push(grantDetailPath(segment, 'treasury'))}
        />
      )}
    </section>
  );
}

type BodyProps = {
  rows: EscrowRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpen: (grantId: string) => void;
};

function ScrollableBody({ rows, sortKey, sortDir, onSort, onOpen }: BodyProps) {
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <THead sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
        <tbody>
          {rows.map((r) => (
            <EscrowRowItem key={r.grantId} row={r} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VirtualBody({ rows, sortKey, sortDir, onSort, onOpen }: BodyProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className="relative max-h-[640px] overflow-auto"
      role="region"
      aria-label="Active grants"
    >
      <table className="w-full min-w-[820px] text-left text-sm">
        <THead sortKey={sortKey} sortDir={sortDir} onSort={onSort} sticky />
        <tbody style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const r = rows[vi.index];
            return (
              <EscrowRowItem
                key={r.grantId}
                row={r}
                onOpen={onOpen}
                style={{
                  position: 'absolute',
                  insetInlineStart: 0,
                  insetInlineEnd: 0,
                  transform: `translateY(${vi.start}px)`,
                  height: ROW_HEIGHT,
                }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function THead({
  sortKey,
  sortDir,
  onSort,
  sticky = false,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  sticky?: boolean;
}) {
  return (
    <thead className={`${sticky ? 'sticky top-0 z-10' : ''} bg-slate-50`}>
      <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {COLUMNS.map((col) => {
          const active = sortKey === col.key;
          const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
          return (
            <th
              key={col.key}
              scope="col"
              className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                col.key === 'grantId'
                  ? 'sticky left-0 z-10 bg-slate-50 shadow-[2px_0_0_rgba(15,23,42,0.04)] sm:static sm:shadow-none'
                  : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className={`group inline-flex items-center gap-1 hover:text-slate-700 ${
                  col.align === 'right' ? 'flex-row-reverse' : ''
                }`}
              >
                <span>{col.label}</span>
                <Icon
                  className={`h-3 w-3 ${active ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-500'}`}
                  aria-hidden
                />
              </button>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function EscrowRowItem({
  row,
  onOpen,
  style,
}: {
  row: EscrowRow;
  onOpen: (pathSegment: string) => void;
  style?: React.CSSProperties;
}) {
  const risk = RISK_PILL[row.riskLevel];
  const mode = MODE_PILL[row.paymentMode];

  const onActivate = () => onOpen(row.pathSegment);
  const onKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <tr
      onClick={onActivate}
      onKeyDown={onKey}
      role="link"
      tabIndex={0}
      aria-label={`Open ${row.grantId}`}
      style={style}
      className="group cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
    >
      <td className="sticky left-0 z-[1] bg-white px-4 py-3 font-semibold text-slate-900 group-hover:bg-slate-50/80 sm:static sm:bg-transparent sm:group-hover:bg-transparent">
        {row.grantId}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
          {truncateAddress(row.builder)}
          <ZKVerifiedDot verified={row.zkVerified} />
        </span>
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
        {formatUsd(row.totalEscrowedUsdc)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
        {formatUsd(row.releasedUsdc)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
        {formatUsd(row.remainingUsdc)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${mode.classes}`}
        >
          {mode.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {row.nextDeadlineMs ? formatDateShort(row.nextDeadlineMs) : '—'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${risk.classes}`}
        >
          {risk.label}
        </span>
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <p className="px-6 py-12 text-center text-sm text-slate-500">
      No grants match the current search.
    </p>
  );
}
