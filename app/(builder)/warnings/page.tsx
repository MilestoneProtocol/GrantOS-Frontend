'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import type { BuilderWarningRecord } from '@/lib/builder-warnings';
import { useAllBuilderWarnings } from '@/lib/builder-warnings';
import { useAuthGuard } from '@/lib/authGuard';
import { AlertTriangle, ArrowRight, Clock, FileSignature, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * Builder's "Warnings" history surface.
 *
 * Route: `/warnings`
 *
 * Why this exists
 * ---------------
 * The dashboard banner is a *current-state* affordance — it retires the
 * moment a warning is slashed (`record.slash` set). Without a separate
 * history list, the builder would lose any UI path to a slashed warning's
 * detail page once the banner disappears. This list is that history —
 * every warning the builder has ever received, active or slashed, sorted
 * most-recent first, each row deep-linking into the existing detail page.
 *
 * Mirrors the sidebar `Warnings` entry from the design and is what the
 * Warning Detail breadcrumb's "Warnings" segment links back to.
 *
 * The page is intentionally client-only — the warning store is sourced
 * from `localStorage`, so we gate on `mounted` to skip an SSR hydration
 * mismatch (same pattern as the dashboard banner stack and the detail
 * page).
 */
export default function BuilderWarningsListPage() {
  const guard = useAuthGuard('builder');
  const { address } = useAccount();
  const warnings = useAllBuilderWarnings(address);

  if (guard.state === 'loading') {
    return (
      <BuilderAppShell navActive="none">
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          Detecting your role…
        </main>
      </BuilderAppShell>
    );
  }
  if (guard.state === 'blocked') return null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCount = warnings.filter((w) => !w.slash).length;
  const slashedCount = warnings.filter((w) => w.slash).length;

  return (
    <BuilderAppShell navActive="none">
      <main className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <PageHeader activeCount={activeCount} slashedCount={slashedCount} mounted={mounted} />

          {!mounted ? (
            <ListSkeleton />
          ) : warnings.length === 0 ? (
            <EmptyState />
          ) : (
            <section
              aria-label="Warnings history"
              className="flex flex-col gap-3"
            >
              {warnings.map((warning) => (
                <WarningHistoryRow key={warning.id} warning={warning} />
              ))}
            </section>
          )}
        </div>
      </main>
    </BuilderAppShell>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function PageHeader({
  activeCount,
  slashedCount,
  mounted,
}: {
  activeCount: number;
  slashedCount: number;
  mounted: boolean;
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Warnings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every warning issued against your milestones — active and resolved.
            Active warnings are time-sensitive; slashed ones are permanent
            audit records.
          </p>
        </div>

        {mounted ? (
          <div className="flex shrink-0 items-center gap-2">
            <CountPill tone="amber" label="Active" count={activeCount} />
            <CountPill tone="red" label="Slashed" count={slashedCount} />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function CountPill({
  tone,
  label,
  count,
}: {
  tone: 'amber' | 'red';
  label: string;
  count: number;
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-red-50 text-red-700 ring-red-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ring-1 ring-inset ${cls}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
        }`}
      />
      {label}: <span className="tabular-nums">{count}</span>
    </span>
  );
}

function WarningHistoryRow({ warning }: { warning: BuilderWarningRecord }) {
  const isSlashed = Boolean(warning.slash);

  return (
    <Link
      href={buildWarningDetailHref(warning.grantId, warning.milestoneId)}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      {/* Left stripe communicates urgency at a glance. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${
          isSlashed ? 'bg-slate-900' : 'bg-red-500'
        }`}
      />

      <div className="flex min-w-0 flex-1 items-start gap-3 pl-2 sm:pl-3">
        <span
          aria-hidden
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isSlashed ? 'bg-slate-900 text-white' : 'bg-red-100 text-red-600'
          }`}
        >
          {isSlashed ? (
            <ShieldX className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              Milestone #{warning.milestoneIndex}: {warning.milestoneTitle}
            </p>
            <StatusPill isSlashed={isSlashed} />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Grant{' '}
            <span className="font-mono font-medium text-slate-700">
              {warning.grantId}
            </span>{' '}
            ·{' '}
            {isSlashed ? (
              <>
                <span className="font-semibold text-red-600">
                  {formatUsd(warning.slash!.amountReturnedUsdc)} USDC
                </span>{' '}
                returned to treasury
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">
                  {formatUsd(warning.amountAtRiskUsdc)} USDC
                </span>{' '}
                at risk
              </>
            )}
          </p>
          <p className="mt-1.5 line-clamp-1 text-xs italic text-slate-500">
            &ldquo;{warning.message}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pl-2 sm:pl-0">
        <RowTiming warning={warning} />
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition group-hover:gap-1.5 group-hover:text-red-700">
          View Details <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function StatusPill({ isSlashed }: { isSlashed: boolean }) {
  if (isSlashed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-700 ring-1 ring-inset ring-red-200">
        <span aria-hidden className="h-1 w-1 rounded-full bg-red-500" />
        Slashed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-inset ring-amber-200">
      <span aria-hidden className="h-1 w-1 rounded-full bg-amber-500" />
      Warning
    </span>
  );
}

function RowTiming({ warning }: { warning: BuilderWarningRecord }) {
  const remaining = useSecondCountdown(warning.slashUnlocksAtIso, {
    paused: Boolean(warning.slash),
  });

  if (warning.slash) {
    return (
      <p className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-100">
        <FileSignature className="h-3 w-3 text-slate-400" />
        Slashed {formatRelative(warning.slash.slashedAtIso)}
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-600 shadow-sm tabular-nums">
      <Clock className="h-3 w-3" />
      {remaining.elapsed ? 'Slash window open' : `Slash in ${remaining.label}`}
    </p>
  );
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center sm:px-10">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <FileSignature className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <h2 className="mt-3 text-base font-bold text-slate-900">
        No warnings — keep it up
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        Warnings appear here when a committee member raises one against one of
        your milestones. You&apos;ll also see the slashed audit trail.
      </p>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-[110px] animate-pulse rounded-xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */

type CountdownSnapshot = { elapsed: boolean; label: string };

function useSecondCountdown(
  targetIso: string,
  { paused }: { paused: boolean },
): CountdownSnapshot {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(() => ({
    elapsed: false,
    label: '—',
  }));

  useEffect(() => {
    if (paused) return;
    const compute = () => setSnapshot(remainingFromNow(targetIso));
    compute();
    if (snapshot.elapsed) return;
    const interval = window.setInterval(compute, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso, paused]);

  return snapshot;
}

function remainingFromNow(targetIso: string): CountdownSnapshot {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { elapsed: false, label: '—' };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { elapsed: true, label: '0h 0m 0s' };

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { elapsed: false, label: `${hours}h ${minutes}m ${seconds}s` };
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** "Just now / 5m ago / 2h ago / 3d ago" relative formatter. */
function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildWarningDetailHref(grantId: string, milestoneId: string): string {
  return `/grants/${encodeURIComponent(grantId)}/milestones/${encodeURIComponent(milestoneId)}/warning`;
}
