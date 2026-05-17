'use client';

import type { CommitteeGrantRoster } from '@/demo/committee-demo';
import Link from 'next/link';
import { Users } from 'lucide-react';

type CommitteeRosterListProps = {
  rosters: CommitteeGrantRoster[];
  /** Connected wallet — highlighted in each roster when present. */
  viewerAddress?: string;
};

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CommitteeRosterList({ rosters, viewerAddress }: CommitteeRosterListProps) {
  const viewer = viewerAddress?.toLowerCase();

  return (
    <div className="mt-6 space-y-4">
      {rosters.map((roster) => (
        <article
          key={roster.grantId}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <Link
                href={`/committee/grants/${encodeURIComponent(roster.grantId)}`}
                className="text-base font-bold text-slate-900 hover:text-blue-700"
              >
                {roster.grantTitle}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                Quorum:{' '}
                <span className="font-semibold text-slate-700">
                  {roster.quorum} of {roster.members.length}
                </span>{' '}
                approvals required per milestone
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <Users className="h-3 w-3" aria-hidden />
              {roster.members.length} members
            </span>
          </header>
          <ul className="divide-y divide-slate-100">
            {roster.members.map((member) => {
              const isViewer = viewer && member.toLowerCase() === viewer;
              return (
                <li
                  key={`${roster.grantId}-${member}`}
                  className={`flex items-center justify-between gap-3 px-5 py-3 text-sm ${
                    isViewer ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <span className="font-mono text-slate-800">{truncateAddress(member)}</span>
                  {isViewer ? (
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      You
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">Committee member</span>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}
