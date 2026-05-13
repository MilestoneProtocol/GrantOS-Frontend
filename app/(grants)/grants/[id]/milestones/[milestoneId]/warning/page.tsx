'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import MilestoneHistoryCard from '@/components/builder/warning-detail/MilestoneHistoryCard';
import WarningDetailCard from '@/components/builder/warning-detail/WarningDetailCard';
import WarningExternalLinks from '@/components/builder/warning-detail/WarningExternalLinks';
import { useBuilderWarning } from '@/lib/builder-warnings';
import { AlertTriangle, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Warning Detail page (US-04 step 3, last screen of the slash flow).
 *
 * Route: `/grants/[id]/milestones/[milestoneId]/warning`
 *
 * Read-only audit-trail surface. The builder lands here after clicking
 * "View Warning Details →" on the dashboard banner — or directly from a
 * notification once the slash is executed. Either way, the page is the
 * persistent record of the warning's lifecycle, surviving the dashboard
 * banner being retired post-slash.
 *
 * Sections (top → bottom):
 *  1. Breadcrumb header — `Dashboard → Grant #[id] → Warning Detail`.
 *  2. `WarningDetailCard` — title, status pill, committee note, meta grid.
 *  3. `MilestoneHistoryCard` — vertical timeline Pending → Slashed.
 *  4. `WarningExternalLinks` — EAS attestation + (post-slash) Arbiscan tx.
 *
 * No buttons, no actions — purely informational, per the PRD.
 */
export default function WarningDetailPage() {
  const params = useParams<{ id: string; milestoneId: string }>();
  const milestoneId = decodeURIComponent(params.milestoneId ?? '');
  const grantIdRaw = decodeURIComponent(params.id ?? '');

  const record = useBuilderWarning(milestoneId);

  // Same hydration-safety pattern we use for the banner stack: the record
  // is sourced from localStorage so SSR can't render the live data, and
  // any time-based bits (countdown, "Just now" labels) inevitably drift.
  // Gating on a mount flag lets the server render the empty skeleton and
  // the client take over without a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pretty grant id for the breadcrumb — accept either `#GRT-8921` or
  // bare `8921` from the URL and normalise.
  const breadcrumbGrantId = formatGrantIdForBreadcrumb(grantIdRaw, record?.grantId);

  return (
    <BuilderAppShell>
      <main className="w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Breadcrumb grantIdLabel={breadcrumbGrantId} />

          {!mounted ? (
            <PageSkeleton />
          ) : record ? (
            <>
              <WarningDetailCard record={record} />
              <MilestoneHistoryCard record={record} />
              <div className="pt-1 pb-6">
                <WarningExternalLinks record={record} />
              </div>
            </>
          ) : (
            <NotFoundState />
          )}
        </div>
      </main>
    </BuilderAppShell>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function Breadcrumb({ grantIdLabel }: { grantIdLabel: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition hover:text-slate-900"
      >
        <Home className="h-3 w-3" /> Dashboard
      </Link>
      <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />
      <Link
        href="/warnings"
        className="rounded-md px-1.5 py-0.5 transition hover:text-slate-900"
      >
        Warnings
      </Link>
      <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />
      <span className="text-slate-700">Grant {grantIdLabel}</span>
      <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />
      <span className="text-red-600">Warning Detail</span>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-[330px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-[280px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

function NotFoundState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <h1 className="mt-3 text-lg font-bold text-slate-900">
        No warning found for this milestone
      </h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        This milestone has no active warning or recorded slash. Either the
        link is stale, or the warning was dismissed by the committee.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Back to Dashboard
      </Link>
    </section>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function formatGrantIdForBreadcrumb(
  fromUrl: string,
  fromRecord: string | undefined,
): string {
  // Prefer the demo's `#GRT-NNNN` formatting when the record is available.
  if (fromRecord) return fromRecord;
  if (!fromUrl) return '—';
  return fromUrl.startsWith('#') ? fromUrl : `#${fromUrl}`;
}
