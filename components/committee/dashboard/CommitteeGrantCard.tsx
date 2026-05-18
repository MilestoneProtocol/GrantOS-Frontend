'use client';

import type { CommitteeDemoGrant, CommitteeMilestoneStatus } from '@/demo/committee-demo';
import { Check, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type CommitteeGrantCardProps = {
  grant: CommitteeDemoGrant;
};

function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

function formatApprovedAt(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

/**
 * Single grant card on the committee dashboard.
 *
 * In the empty state, the inner milestone rows are *read-only status badges*:
 * no Approve / Reject controls show because nothing is `submitted`.
 */
export default function CommitteeGrantCard({ grant }: CommitteeGrantCardProps) {
  const pathname = usePathname();
  const isCompleted = grant.status === 'completed';

  const grantsBase = pathname?.startsWith('/dao') ? '/dao/grants' : '/committee/grants';
  const href = `${grantsBase}/${encodeURIComponent(grant.id)}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <div className="p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight text-slate-900 group-hover:text-blue-700">
              {grant.title}
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-500">
              Builder: {truncateAddress(grant.builder)}
            </p>
          </div>
          <StatusBadge status={grant.status} />
        </header>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Total Allocation</dt>
            <dd className="font-semibold text-slate-900">${formatUsd(grant.totalAllocation)} USDC</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Milestone Progress</dt>
            <dd className="font-semibold text-slate-900">
              {grant.milestonesCompleted} / {grant.milestonesTotal} Completed
            </dd>
          </div>
        </dl>

        {isCompleted ? (
          <div className="mt-5 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Final Status
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  All Milestones Approved
                </span>
              </div>
              {grant.approvedAt ? (
                <span className="text-[11px] text-slate-500">
                  {formatApprovedAt(grant.approvedAt)}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Current Milestones
            </p>
            <ul className="mt-2 space-y-2">
              {grant.milestones.map((m) => (
                <li
                  key={`${grant.id}-${m.label}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MilestoneStatusDot status={m.status} />
                    <span
                      className={`truncate font-medium ${
                        m.status === 'not_started' ? 'text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {m.label}: {m.title}
                    </span>
                  </span>
                  <MilestoneStatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <span
        className={`absolute inset-x-0 bottom-0 h-1.5 ${
          isCompleted ? 'bg-violet-500' : 'bg-emerald-500'
        }`}
        aria-hidden
      />
    </Link>
  );
}

function StatusBadge({ status }: { status: CommitteeDemoGrant['status'] }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
      In Progress
    </span>
  );
}

function MilestoneStatusDot({ status }: { status: CommitteeMilestoneStatus }) {
  if (status === 'completed') {
    return (
      <span
        className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500"
        aria-hidden
      />
    );
  }
  if (status === 'building' || status === 'submitted') {
    return (
      <span
        className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500"
        aria-hidden
      />
    );
  }
  if (status === 'rejected') {
    return (
      <span
        className="flex h-2 w-2 shrink-0 rounded-full bg-red-500"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="flex h-2 w-2 shrink-0 rounded-full border border-slate-300 bg-white"
      aria-hidden
    />
  );
}

function MilestoneStatusBadge({ status }: { status: CommitteeMilestoneStatus }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      );
    case 'building':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          Building
        </span>
      );
    case 'submitted':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
          Submitted
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
          Rejected
        </span>
      );
    case 'not_started':
    default:
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Not Started
        </span>
      );
  }
}
