'use client';

import TaskEvidencePanel from '@/components/tasks/TaskEvidencePanel';
import IssueWarningPanel from '@/components/committee/actions/IssueWarningPanel';
import SlashConfirmationDialog from '@/components/committee/actions/SlashConfirmationDialog';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import type { CommitteeTask } from '@/lib/tasks/types';
import type { OverdueMilestone } from '@/demo/committee-demo';
import { useDemoSlashFlow } from '@/lib/slash-flow';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  FileWarning,
  Gavel,
  Loader2,
  Star,
  Vote,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PRIORITY_BORDER: Record<CommitteeTask['priority'], string> = {
  critical: 'border-l-red-500',
  urgent: 'border-l-orange-500',
  normal: 'border-l-blue-500',
};

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function useCountdown(targetIso?: string) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!targetIso) {
      setLabel(null);
      return;
    }
    const tick = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel('Past 24h');
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(`${h}h ${m}m`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return label;
}

type TaskCardProps = {
  task: CommitteeTask;
  onComplete: (taskId: string) => void;
  removing?: boolean;
};

function TaskTypeIcon({ type }: { type: CommitteeTask['type'] }) {
  const className = 'h-5 w-5 shrink-0';
  switch (type) {
    case 'SLASH_READY':
      return <Gavel className={`${className} text-red-600`} aria-hidden />;
    case 'WARNING_OVERDUE':
    case 'WARNING_NEEDED':
      return <FileWarning className={`${className} text-orange-600`} aria-hidden />;
    case 'VOTE_NEEDED':
      return <Vote className={`${className} text-orange-600`} aria-hidden />;
    case 'AWAITING_QUORUM':
      return <Clock className={`${className} text-blue-600`} aria-hidden />;
    default:
      return <AlertTriangle className={`${className} text-blue-600`} aria-hidden />;
  }
}

function buildSlashMilestone(task: CommitteeTask): OverdueMilestone {
  if (task.overdueMilestone) return task.overdueMilestone;
  return {
    id: task.taskId,
    grantId: task.grantId,
    grantTitle: task.grantTitle,
    milestoneIndex: task.milestoneIndex,
    totalMilestones: 4,
    milestoneTitle: task.milestoneTitle,
    amount: { value: 10_000, token: 'USDC' },
    paymentMode: 'lump_sum',
    deadlineIso: task.deadline,
    state: {
      kind: 'slash_available',
      warningIssuedAtIso: task.warningIssuedAtIso ?? new Date().toISOString(),
      attestationUrl: 'https://arbitrum.easscan.org/attestation/view/0x0',
    },
    builderAddress: task.builderAddress,
    escrowBalanceUsdc: 10_000,
    daysOverdue: 3,
    warningMessageDraft: 'Milestone overdue — submit deliverables or escrow will be slashed.',
    activity: [],
  };
}

export default function TaskCard({ task, onComplete, removing }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const slashFlow = useDemoSlashFlow();
  const countdown = useCountdown(
    task.isWithin24Hours ? task.slashUnlocksAtIso ?? task.deadline : undefined,
  );

  const grantHref = task.grantPathId ? `/grants/${task.grantPathId}` : '/grants';

  useEffect(() => {
    if (slashFlow.state.kind === 'confirmed') {
      setSlashOpen(false);
      onComplete(task.taskId);
    }
  }, [slashFlow.state.kind, onComplete, task.taskId]);

  const handleVoteComplete = useCallback(() => {
    onComplete(task.taskId);
    setExpanded(false);
  }, [onComplete, task.taskId]);

  const handleWarningConfirmed = useCallback(() => {
    onComplete(task.taskId);
    setExpanded(false);
  }, [onComplete, task.taskId]);

  const amountLabel = useMemo(() => {
    const m = task.overdueMilestone;
    if (m) return `${m.amount.value.toLocaleString()} ${m.amount.token}`;
    return '10,000 USDC';
  }, [task.overdueMilestone]);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white shadow-sm transition dark:border-slate-700 dark:bg-slate-900/60 ${PRIORITY_BORDER[task.priority]} ${
        removing ? 'pointer-events-none scale-[0.98] opacity-0 transition duration-300' : ''
      }`}
    >
      <header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <section className="min-w-0 flex-1 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <TaskTypeIcon type={task.type} />
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {task.grantId}
            </span>
            {countdown && task.priority !== 'normal' ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  task.type === 'SLASH_READY'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                }`}
              >
                {countdown}
              </span>
            ) : null}
          </p>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
            {task.milestoneTitle}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{task.description}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{truncateAddress(task.builderAddress)}</span>
            <ZKVerifiedBadge verified={task.zkVerified} />
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden />
              Rep: {task.reputationScore}
            </span>
          </p>
        </section>

        <aside className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {task.type === 'VOTE_NEEDED' ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
              >
                {expanded ? 'Hide evidence' : 'Approve / Reject'}
              </button>
            </>
          ) : null}

          {task.type === 'WARNING_NEEDED' || task.type === 'WARNING_OVERDUE' ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="min-h-11 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Issue Warning
            </button>
          ) : null}

          {task.type === 'SLASH_READY' ? (
            <button
              type="button"
              onClick={() => setSlashOpen(true)}
              disabled={slashFlow.state.kind !== 'idle'}
              className="inline-flex min-h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {slashFlow.state.kind !== 'idle' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Gavel className="h-4 w-4" aria-hidden />
              )}
              Slash Now
            </button>
          ) : null}

          {task.type === 'AWAITING_QUORUM' && task.quorumVotes ? (
            <p className="text-right text-sm font-medium text-slate-500 dark:text-slate-400">
              Waiting for quorum
              <span className="mt-0.5 block font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                {task.quorumVotes.current} / {task.quorumVotes.required}
              </span>
            </p>
          ) : null}

          {task.type === 'DEADLINE_APPROACHING' ? (
            <Link
              href={grantHref}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100"
            >
              View Milestone
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </aside>
      </header>

      {expanded && task.submission && task.type === 'VOTE_NEEDED' ? (
        <>
          <section className="hidden md:block">
            <TaskEvidencePanel
              submission={task.submission}
              onVoteComplete={handleVoteComplete}
              onClose={() => setExpanded(false)}
              variant="inline"
            />
          </section>
          <section className="md:hidden">
            <TaskEvidencePanel
              submission={task.submission}
              onVoteComplete={handleVoteComplete}
              onClose={() => setExpanded(false)}
              variant="sheet"
            />
          </section>
        </>
      ) : null}

      {expanded &&
      task.overdueMilestone &&
      (task.type === 'WARNING_NEEDED' || task.type === 'WARNING_OVERDUE') ? (
        <IssueWarningPanel
          milestone={task.overdueMilestone}
          onCancel={() => setExpanded(false)}
          onConfirmed={() => handleWarningConfirmed()}
        />
      ) : null}

      <SlashConfirmationDialog
        open={slashOpen}
        amountLabel={amountLabel}
        flowState={slashFlow.state}
        onCancel={() => setSlashOpen(false)}
        onConfirm={() => slashFlow.start()}
      />
    </article>
  );
}
