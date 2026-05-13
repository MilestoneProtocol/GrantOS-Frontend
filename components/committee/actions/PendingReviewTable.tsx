'use client';

import type { PendingReviewSummary } from '@/demo/committee-demo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PendingReviewTableProps = {
  rows: PendingReviewSummary[];
  /**
   * Builds the deep-link for a single milestone. Defaults to
   * `/committee/reviews/[id]` — a focused single-panel view that shows only
   * the tapped milestone instead of the full review queue.
   */
  buildReviewHref?: (submissionId: string) => string;
};

const defaultBuildReviewHref = (id: string) =>
  `/committee/reviews/${encodeURIComponent(id)}`;

/**
 * Compact pending-review table — a quick-glance summary of milestones
 * awaiting committee review. Every row (grant title link, Approve, Reject)
 * deep-links to the focused single-milestone view so the committee member
 * doesn't have to wade through the rest of the queue to act on one item.
 */
export default function PendingReviewTable({
  rows,
  buildReviewHref = defaultBuildReviewHref,
}: PendingReviewTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">No reviews pending</p>
        <p className="mt-1 text-xs text-slate-500">
          When builders submit milestones for review, they&rsquo;ll appear here for triage.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <Th className="w-[40%]">Grant &amp; Milestone</Th>
              <Th>Submitted</Th>
              <Th>Deadline</Th>
              <Th className="text-right">Committee Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <PendingRow
                key={row.id}
                row={row}
                isLast={i === rows.length - 1}
                href={buildReviewHref(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 ${className ?? ''}`}
    >
      {children}
    </th>
  );
}

function PendingRow({
  row,
  isLast,
  href,
}: {
  row: PendingReviewSummary;
  isLast: boolean;
  href: string;
}) {
  const router = useRouter();

  return (
    <tr className={isLast ? '' : 'border-b border-slate-100'}>
      <td className="px-5 py-4">
        <Link href={href} className="font-semibold text-blue-600 hover:text-blue-700">
          {row.grantTitle}
        </Link>
        <p className="mt-0.5 text-xs text-slate-500">{row.milestoneTitle}</p>
      </td>
      <td className="px-5 py-4 text-sm text-slate-600">{row.submittedLabel}</td>
      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(row.deadlineIso)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(href)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => router.push(href)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Approve
          </button>
        </div>
      </td>
    </tr>
  );
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
