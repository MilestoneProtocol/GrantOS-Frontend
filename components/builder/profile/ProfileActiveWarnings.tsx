'use client';

import type { BuilderWarningRecord } from '@/lib/builder-warnings';
import { useAllBuilderWarnings } from '@/lib/builder-warnings';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

function buildWarningDetailHref(grantId: string, milestoneId: string): string {
  return `/grants/${encodeURIComponent(grantId)}/milestones/${encodeURIComponent(milestoneId)}/warning`;
}

type CountdownSnapshot = { elapsed: boolean; label: string };

function remainingFromNow(targetIso: string): CountdownSnapshot {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { elapsed: false, label: '—' };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { elapsed: true, label: '0h 0m' };
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { elapsed: false, label: `${hours}h ${minutes}m` };
}

function useSlashCountdown(targetIso: string): CountdownSnapshot {
  const compute = () => remainingFromNow(targetIso);
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(compute);
  useEffect(() => {
    if (snapshot.elapsed) return;
    const id = window.setInterval(() => setSnapshot(compute()), 1000);
    return () => window.clearInterval(id);
  }, [targetIso, snapshot.elapsed]);
  return snapshot;
}

function ProfileWarningCard({ warning }: { warning: BuilderWarningRecord }) {
  const remaining = useSlashCountdown(warning.slashUnlocksAtIso);

  return (
    <div
      role="alert"
      className="overflow-hidden rounded-xl border border-red-200 bg-red-50/60 shadow-sm"
    >
      <div className="flex items-stretch">
        <span aria-hidden className="w-1 shrink-0 bg-red-500" />
        <div className="flex w-full flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Active Warning: {warning.milestoneTitle}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600">
                #{warning.grantId}
                {warning.grantTitle ? ` · ${warning.grantTitle}` : ''}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                {warning.message}
              </p>
              <Link
                href={buildWarningDetailHref(warning.grantId, warning.milestoneId)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-800"
              >
                View Details →
              </Link>
            </div>
          </div>
          <div className="shrink-0 text-right sm:pt-0.5">
            {remaining.elapsed ? (
              <p className="text-sm font-bold text-red-700">Slash window open</p>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                  Slash Eligibility in:
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-red-700">
                  {remaining.label}
                </p>
              </>
            )}
            {!remaining.elapsed ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-500">
                <Clock className="h-3 w-3" aria-hidden />
                Live countdown
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Active warnings for the private profile — hidden when none (no empty state). */
export default function ProfileActiveWarnings() {
  const { address } = useAccount();
  const warnings = useAllBuilderWarnings(address);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const active = warnings.filter((w) => !w.slash);
  if (active.length === 0) return null;

  return (
    <section aria-label="Active warnings" className="flex flex-col gap-3">
      {active.map((w) => (
        <ProfileWarningCard key={w.id} warning={w} />
      ))}
    </section>
  );
}
