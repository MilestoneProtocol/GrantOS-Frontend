import type { MilestoneActivityEvent } from '@/demo/committee-demo';
import { ExternalLink } from 'lucide-react';

type MilestoneActivityTimelineProps = {
  events: MilestoneActivityEvent[];
  /** Arbiscan URL for the grant escrow contract / address-level activity. */
  arbiscanUrl?: string;
};

/**
 * Read-only on-chain audit trail for the milestone. Sits beneath the warning
 * issuance panel so committee members can scan the timeline (deadline
 * passed, stream paused, prior warnings) before signing the attestation.
 *
 * Items are rendered as a simple dotted vertical timeline. The "View
 * Arbiscan" link is a deep-link to the protocol's address page; in
 * production wire this to `${ARBISCAN_BASE}/address/${grantEscrowAddress}`.
 */
export default function MilestoneActivityTimeline({
  events,
  arbiscanUrl = 'https://arbiscan.io',
}: MilestoneActivityTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900">Milestone Activity</h2>
        <a
          href={arbiscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
        >
          View Arbiscan
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </header>

      <ol className="mt-4 space-y-4">
        {events.map((event) => (
          <TimelineRow key={event.id} event={event} />
        ))}
      </ol>
    </section>
  );
}

function TimelineRow({ event }: { event: MilestoneActivityEvent }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-slate-300"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
          <p className="shrink-0 text-xs text-slate-400">{event.relativeLabel}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{event.description}</p>
      </div>
    </li>
  );
}
