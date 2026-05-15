'use client';

import type { CommitteeReviewSubmission } from '@/demo/committee-demo';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import VotePendingOverlay from '@/components/committee/reviews/VotePendingOverlay';
import { useDemoVoteFlow, type VoteIntent } from '@/lib/committee-vote-flow';
import { CheckCircle2, ExternalLink, Sparkles, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { useEffect } from 'react';

type TaskEvidencePanelProps = {
  submission: CommitteeReviewSubmission;
  onVoteComplete: (intent: VoteIntent) => void;
  onClose: () => void;
  /** Mobile bottom-sheet vs inline desktop panel */
  variant?: 'inline' | 'sheet';
};

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function TaskEvidencePanel({
  submission,
  onVoteComplete,
  onClose,
  variant = 'inline',
}: TaskEvidencePanelProps) {
  const flow = useDemoVoteFlow();

  useEffect(() => {
    if (flow.state.kind === 'voted') {
      onVoteComplete(flow.state.intent);
    }
  }, [flow.state, onVoteComplete]);

  const shellClass =
    variant === 'sheet'
      ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6'
      : 'border-t border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-5 sm:py-5';

  const aiTone =
    submission.aiVerdictTags[0]?.tone === 'negative'
      ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/50'
      : submission.aiVerdictTags[0]?.tone === 'neutral'
        ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200';

  return (
    <section className={shellClass} aria-label="Evidence preview">
      {variant === 'sheet' ? (
        <button
          type="button"
          onClick={onClose}
          className="mb-3 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
        >
          Close preview
        </button>
      ) : null}

      <div className="relative grid gap-4 sm:grid-cols-2">
        {flow.state.kind === 'confirming' || flow.state.kind === 'submitted' ? (
          <VotePendingOverlay
            state={flow.state.kind}
            intent={flow.state.intent}
            txHash={flow.state.kind === 'submitted' ? flow.state.txHash : undefined}
          />
        ) : null}

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">ZK proof</h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ZKVerifiedBadge verified={submission.zkVerified} />
            {submission.githubPrUrl ? (
              <a
                href={submission.githubPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View PR
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {submission.zkVerified
              ? 'Cryptographic verification passed onchain.'
              : 'Proof verification failed or is pending.'}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI verdict</h4>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${aiTone}`}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {submission.aiVerdictTags[0]?.label ?? 'Advisory'}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {submission.aiVerdictSummary}
          </p>
        </article>
      </div>

      <blockquote className="rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-sm italic leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        {submission.builderSummary}
        <footer className="mt-2 not-italic text-xs font-medium text-slate-500">
          — {truncateAddress(submission.builder)}
        </footer>
      </blockquote>

      {submission.easAttestationUrl ? (
        <a
          href={submission.easAttestationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View EAS attestation
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Collapse
        </button>
        <button
          type="button"
          disabled={flow.state.kind !== 'idle'}
          onClick={() => flow.start('reject')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <ThumbsDown className="h-4 w-4" aria-hidden />
          Reject
        </button>
        <button
          type="button"
          disabled={flow.state.kind !== 'idle'}
          onClick={() => flow.start('approve')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          <ThumbsUp className="h-4 w-4" aria-hidden />
          Approve
        </button>
      </footer>

      {flow.state.kind === 'voted' ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {flow.state.intent === 'approve' ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          Vote recorded — task will clear from your queue.
        </p>
      ) : null}
    </section>
  );
}
