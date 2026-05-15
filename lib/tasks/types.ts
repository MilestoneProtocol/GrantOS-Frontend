import type { OverdueMilestone } from '@/demo/committee-demo';
import type { CommitteeReviewSubmission } from '@/demo/committee-demo';

export type TaskType =
  | 'SLASH_READY'
  | 'WARNING_OVERDUE'
  | 'WARNING_NEEDED'
  | 'VOTE_NEEDED'
  | 'AWAITING_QUORUM'
  | 'DEADLINE_APPROACHING';

export type TaskPriority = 'critical' | 'urgent' | 'normal';

export type CommitteeTask = {
  taskId: string;
  type: TaskType;
  priority: TaskPriority;
  grantId: string;
  grantTitle: string;
  milestoneIndex: number;
  milestoneTitle: string;
  builderAddress: `0x${string}`;
  /** ISO-8601 deadline for the milestone. */
  deadline: string;
  createdAt: string;
  actionLabel: string;
  /** Plain-English line shown on the card. */
  description: string;
  zkVerified: boolean;
  reputationScore: number;
  /** True when the deadline or slash window is within 24 hours. */
  isWithin24Hours: boolean;
  /** Populated for vote tasks — drives the evidence panel. */
  submission?: CommitteeReviewSubmission;
  /** Populated for warning / slash tasks. */
  overdueMilestone?: OverdueMilestone;
  quorumVotes?: { current: number; required: number };
  slashUnlocksAtIso?: string;
  warningIssuedAtIso?: string;
  grantPathId?: string;
};

export type TasksSummary = {
  urgent: number;
  pending: number;
  awaitingQuorum: number;
  completedToday: number;
};

export type TasksQueue = {
  tasks: CommitteeTask[];
  summary: TasksSummary;
  /** Critical + urgent count for the sidebar badge. */
  badgeCount: number;
};
