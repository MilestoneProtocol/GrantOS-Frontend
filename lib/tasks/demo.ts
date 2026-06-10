import {
  getCommitteeDemoActions,
  getCommitteeDemoActiveReviews,
  type CommitteeReviewSubmission,
  type OverdueMilestone,
} from '@/demo/committee-demo';
import type { Address } from 'viem';
import type { CommitteeTask, TasksQueue } from './types';
import { computeTasksSummary, sortTasks, tasksBadgeCount } from './utils';

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function parseDeadline(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Date.now() : t;
}

function hoursUntil(iso: string): number {
  return (parseDeadline(iso) - Date.now()) / MS_HOUR;
}

function isWithin24Hours(iso: string): boolean {
  const h = hoursUntil(iso);
  return h >= 0 && h <= 24;
}

function grantPathId(grantId: string): string {
  const digits = grantId.replace(/\D/g, '');
  return digits || grantId.replace('#', '');
}

function taskFromOverdue(m: OverdueMilestone, _viewer: Address): CommitteeTask | null {
  const deadlineMs = parseDeadline(m.deadlineIso);
  const hoursOverdue = (Date.now() - deadlineMs) / MS_HOUR;

  if (m.state.kind === 'slashed') return null;

  if (m.state.kind === 'slash_available') {
    return {
      taskId: `slash-${m.id}`,
      type: 'SLASH_READY',
      priority: 'critical',
      grantId: m.grantId,
      grantTitle: m.grantTitle,
      milestoneIndex: m.milestoneIndex,
      milestoneTitle: m.milestoneTitle,
      builderAddress: m.builderAddress,
      deadline: m.deadlineIso,
      createdAt: m.state.warningIssuedAtIso,
      actionLabel: 'Slash Now',
      description: `Slash-ready warning past deadline for "${m.milestoneTitle}".`,
      zkVerified: true,
      reputationScore: 840,
      isWithin24Hours: true,
      overdueMilestone: m,
      warningIssuedAtIso: m.state.warningIssuedAtIso,
      grantPathId: grantPathId(m.grantId),
    };
  }

  if (m.state.kind === 'warning_issued') {
    const unlockMs = parseDeadline(m.state.slashUnlocksAtIso);
    if (Date.now() >= unlockMs) {
      return {
        taskId: `slash-${m.id}`,
        type: 'SLASH_READY',
        priority: 'critical',
        grantId: m.grantId,
        grantTitle: m.grantTitle,
        milestoneIndex: m.milestoneIndex,
        milestoneTitle: m.milestoneTitle,
        builderAddress: m.builderAddress,
        deadline: m.deadlineIso,
        createdAt: m.state.warningIssuedAtIso,
        actionLabel: 'Slash Now',
        description: `Warning attestation past 24h — "${m.milestoneTitle}" is slash-eligible.`,
        zkVerified: true,
        reputationScore: 720,
        isWithin24Hours: true,
        overdueMilestone: {
          ...m,
          state: {
            kind: 'slash_available',
            warningIssuedAtIso: m.state.warningIssuedAtIso,
            attestationUrl: m.state.attestationUrl,
          },
        },
        slashUnlocksAtIso: m.state.slashUnlocksAtIso,
        warningIssuedAtIso: m.state.warningIssuedAtIso,
        grantPathId: grantPathId(m.grantId),
      };
    }
    return null;
  }

  if (m.state.kind === 'deadline_missed') {
    const critical = hoursOverdue >= 48;
    return {
      taskId: `warn-${m.id}`,
      type: critical ? 'WARNING_OVERDUE' : 'WARNING_NEEDED',
      priority: critical ? 'critical' : 'urgent',
      grantId: m.grantId,
      grantTitle: m.grantTitle,
      milestoneIndex: m.milestoneIndex,
      milestoneTitle: m.milestoneTitle,
      builderAddress: m.builderAddress,
      deadline: m.deadlineIso,
      createdAt: m.deadlineIso,
      actionLabel: 'Issue Warning',
      description: critical
        ? `Milestone overdue ${Math.floor(hoursOverdue / 24)}+ days with no warning — "${m.milestoneTitle}".`
        : `Milestone overdue — issue a warning for "${m.milestoneTitle}".`,
      zkVerified: false,
      reputationScore: 640,
      isWithin24Hours: hoursOverdue < 24,
      overdueMilestone: m,
      grantPathId: grantPathId(m.grantId),
    };
  }

  return null;
}

function taskFromSubmission(
  s: CommitteeReviewSubmission,
  viewer: Address,
): CommitteeTask | null {
  if (s.finalOutcome) return null;

  const approved = s.approvers.filter((a) => a.status === 'approved').length;
  const rejected = s.approvers.filter((a) => a.status === 'rejected').length;
  const viewerLower = viewer.toLowerCase();

  if (!s.currentMemberVoted) {
    return {
      taskId: `vote-${s.id}`,
      type: 'VOTE_NEEDED',
      priority: 'urgent',
      grantId: s.grantId,
      grantTitle: s.grantTitle,
      milestoneIndex: s.milestoneIndex,
      milestoneTitle: s.milestoneTitle,
      builderAddress: s.builder,
      deadline: new Date(Date.now() + 3 * MS_DAY).toISOString(),
      createdAt: new Date().toISOString(),
      actionLabel: 'Review & Vote',
      description: `Builder submitted ZK proof for "${s.milestoneTitle}" — your vote is needed.`,
      zkVerified: s.zkVerified,
      reputationScore: s.zkVerified ? 880 : 520,
      isWithin24Hours: true,
      submission: s,
      grantPathId: grantPathId(s.grantId),
    };
  }

  const current = approved + rejected;
  if (current < s.committeeRequired) {
    return {
      taskId: `quorum-${s.id}`,
      type: 'AWAITING_QUORUM',
      priority: 'normal',
      grantId: s.grantId,
      grantTitle: s.grantTitle,
      milestoneIndex: s.milestoneIndex,
      milestoneTitle: s.milestoneTitle,
      builderAddress: s.builder,
      deadline: new Date(Date.now() + 5 * MS_DAY).toISOString(),
      createdAt: new Date().toISOString(),
      actionLabel: 'Waiting for quorum',
      description: `You voted on "${s.milestoneTitle}" — awaiting other committee members.`,
      zkVerified: s.zkVerified,
      reputationScore: s.zkVerified ? 910 : 600,
      isWithin24Hours: false,
      submission: s,
      quorumVotes: { current: current, required: s.committeeRequired },
      grantPathId: grantPathId(s.grantId),
    };
  }

  return null;
}

/** Extra demo tasks aligned with the UX Pilot action-queue mock. */
function syntheticTasks(viewer: Address): CommitteeTask[] {
  const slashReady: CommitteeTask = {
    taskId: 'demo-slash-grnt-1042',
    type: 'SLASH_READY',
    priority: 'critical',
    grantId: 'GRNT-1042',
    grantTitle: 'Alpha Mainnet Deployment',
    milestoneIndex: 2,
    milestoneTitle: 'Alpha Mainnet Deployment',
    builderAddress: '0x4f2BA1Ce9d3Ec1a2Bd5cf60D12C5b3e9F87A8b21',
    deadline: new Date(Date.now() - 3 * MS_DAY).toISOString(),
    createdAt: new Date(Date.now() - 2 * MS_DAY).toISOString(),
    actionLabel: 'Slash Now',
    description: 'Slash-ready warning past deadline for "Alpha Mainnet Deployment".',
    zkVerified: true,
    reputationScore: 840,
    isWithin24Hours: true,
    grantPathId: '1042',
    warningIssuedAtIso: new Date(Date.now() - 30 * MS_HOUR).toISOString(),
  };

  const voteNeeded = getCommitteeDemoActiveReviews().pending.find((p) => !p.currentMemberVoted);
  const awaiting = getCommitteeDemoActiveReviews().pending.find((p) => p.currentMemberVoted);

  const approaching: CommitteeTask = {
    taskId: 'demo-deadline-grnt-5501',
    type: 'DEADLINE_APPROACHING',
    priority: 'normal',
    grantId: 'GRNT-5501',
    grantTitle: 'Indexer Reliability',
    milestoneIndex: 1,
    milestoneTitle: 'RPC Failover Module',
    builderAddress: '0x2c4faa31BE7C0E7c5BBF7cdE2b0C5dF4EFA2a8F1a',
    deadline: new Date(Date.now() + 4 * MS_DAY).toISOString(),
    createdAt: new Date().toISOString(),
    actionLabel: 'View Milestone',
    description: 'Deadline in 4 days — milestone still pending builder submission.',
    zkVerified: true,
    reputationScore: 790,
    isWithin24Hours: false,
    grantPathId: '5501',
  };

  const out: CommitteeTask[] = [slashReady, approaching];
  if (voteNeeded) {
    const t = taskFromSubmission(voteNeeded, viewer);
    if (t) out.push({ ...t, grantId: 'GRNT-2099', taskId: 'demo-vote-grnt-2099' });
  }
  if (awaiting) {
    const t = taskFromSubmission(awaiting, viewer);
    if (t) {
      out.push({
        ...t,
        grantId: 'GRNT-3102',
        taskId: 'demo-quorum-grnt-3102',
        grantTitle: 'UI Component Library',
        milestoneTitle: 'UI Component Library',
      });
    }
  }
  return out;
}

export function generateTasksDemo(address: Address): TasksQueue {
  const actions = getCommitteeDemoActions();
  const reviews = getCommitteeDemoActiveReviews();

  const fromOverdue = actions.overdue
    .map((m) => taskFromOverdue(m, address))
    .filter((t): t is CommitteeTask => t !== null);

  const fromReviews = reviews.pending
    .map((s) => taskFromSubmission(s, address))
    .filter((t): t is CommitteeTask => t !== null);

  const merged = new Map<string, CommitteeTask>();
  for (const t of [...syntheticTasks(address), ...fromOverdue, ...fromReviews]) {
    merged.set(t.taskId, t);
  }

  const tasks = sortTasks([...merged.values()]);
  const summary = computeTasksSummary(tasks);

  return {
    tasks,
    summary,
    badgeCount: tasksBadgeCount(tasks),
  };
}
