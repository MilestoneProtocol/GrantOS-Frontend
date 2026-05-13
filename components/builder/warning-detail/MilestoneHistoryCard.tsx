'use client';

import type { BuilderWarningRecord } from '@/lib/builder-warnings';

type MilestoneHistoryCardProps = {
  record: BuilderWarningRecord;
};

type TimelineEntry = {
  id: string;
  title: string;
  dateIso: string;
  description: string;
  /**
   * `current` paints the dot/title accent red; `terminal` is reserved for
   * the slashed event (also red, but bolder). `past` is the default grey
   * treatment for completed-but-no-longer-active events.
   */
  tone: 'past' | 'current' | 'terminal';
};

/**
 * Vertical timeline rendering of the milestone's lifecycle:
 *  - **Approved (Pending)** — when the grant funded.
 *  - **Overdue** — when the deadline lapsed.
 *  - **Warning Issued** — when this record was created (the current state
 *    if `record.slash` is absent).
 *  - **Slashed Executed** — only rendered when `record.slash` is set;
 *    painted red as the terminal step.
 *
 * Read-only, no actions. Mirrors the PRD's required entries 1:1.
 */
export default function MilestoneHistoryCard({ record }: MilestoneHistoryCardProps) {
  const entries = buildTimeline(record);

  return (
    <section
      aria-labelledby="warning-history-heading"
      className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8 sm:py-7"
    >
      <h2
        id="warning-history-heading"
        className="text-base font-bold tracking-tight text-slate-900"
      >
        Milestone History
      </h2>

      <ol className="mt-5 space-y-5">
        {entries.map((entry, idx) => (
          <TimelineRow
            key={entry.id}
            entry={entry}
            isLast={idx === entries.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function TimelineRow({
  entry,
  isLast,
}: {
  entry: TimelineEntry;
  isLast: boolean;
}) {
  const isRed = entry.tone === 'terminal' || entry.tone === 'current';
  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-3">
      <div className="relative flex h-full flex-col items-center pt-1">
        <span
          aria-hidden
          className={`relative z-10 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-4 ring-white ${
            entry.tone === 'terminal'
              ? 'bg-red-500'
              : entry.tone === 'current'
              ? 'bg-red-500'
              : 'bg-slate-300'
          }`}
        />
        {!isLast ? (
          <span
            aria-hidden
            className="mt-1 w-px flex-1 bg-slate-200"
          />
        ) : null}
      </div>
      <div className="pb-1">
        <p
          className={`text-sm font-semibold leading-tight ${
            isRed ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          {entry.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          <span className="font-medium text-slate-600">
            {formatDate(entry.dateIso)}
          </span>{' '}
          • {entry.description}
        </p>
      </div>
    </li>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function buildTimeline(record: BuilderWarningRecord): TimelineEntry[] {
  const isSlashed = Boolean(record.slash);
  // Always-present anchors; fall back to derived defaults when the seed
  // data didn't include them (e.g. older saved records).
  const warningIssuedAt = new Date(record.warningIssuedAtIso);
  const overdueAt = record.milestoneOverdueAtIso
    ? new Date(record.milestoneOverdueAtIso)
    : new Date(warningIssuedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
  const approvedAt = record.milestoneApprovedAtIso
    ? new Date(record.milestoneApprovedAtIso)
    : new Date(overdueAt.getTime() - 90 * 24 * 60 * 60 * 1000);

  const entries: TimelineEntry[] = [
    {
      id: 'approved',
      title: 'Milestone Approved (Pending)',
      dateIso: approvedAt.toISOString(),
      description: 'Initial grant funding locked in Superfluid stream.',
      tone: 'past',
    },
    {
      id: 'overdue',
      title: 'Milestone Overdue',
      dateIso: overdueAt.toISOString(),
      description: 'Original deadline passed. 7-day grace period initiated.',
      tone: 'past',
    },
    {
      id: 'warning',
      title: 'Warning Issued',
      dateIso: record.warningIssuedAtIso,
      description:
        'Committee issued formal warning. 24h countdown to slash began.',
      tone: isSlashed ? 'past' : 'current',
    },
  ];

  if (isSlashed) {
    entries.push({
      id: 'slashed',
      title: 'Slashed Executed',
      dateIso: record.slash!.slashedAtIso,
      description: `Funds returned to DAO treasury. Builder reputation decremented (-15).`,
      tone: 'terminal',
    });
  }

  return entries;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
