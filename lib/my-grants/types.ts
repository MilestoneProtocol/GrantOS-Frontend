export type MyGrantMilestoneStatus =
  | 'pending'
  | 'approved'
  | 'streaming'
  | 'overdue'
  | 'warning_issued'
  | 'slashed';

export type MyGrantFinalStatus =
  | 'Active'
  | 'Completed'
  | 'Partially Slashed'
  | 'Fully Slashed'
  | 'Warning Issued';

export type MyGrantFilterTag = 'active' | 'completed' | 'slashed' | 'warning_issued' | 'streaming';

export type MyGrantMilestone = {
  index: number;
  title: string;
  status: MyGrantMilestoneStatus;
  amountUsdc: number;
  deadlineMs: number;
  proofTypeLabel: string;
};

export type MyGrantRecord = {
  key: string;
  grantId: string;
  pathSegment: string;
  title: string;
  daoName: string;
  committeeCount: number;
  committeeAddresses: string[];
  createdAtMs: number;
  finalDeadlineMs: number;
  totalUsdc: number;
  releasedUsdc: number;
  forfeitedUsdc: number;
  paymentMode: 'streaming' | 'lump_sum';
  paymentLabel: string;
  finalStatus: MyGrantFinalStatus;
  filterTags: MyGrantFilterTag[];
  milestonesCompleted: number;
  milestonesTotal: number;
  zkProofsSubmitted: number;
  isStreamingActive: boolean;
  streamRateUsdcPerSec: number;
  streamAccumulatedUsdcAtEpoch: number;
  streamEpochMs: number;
  milestones: MyGrantMilestone[];
  source: 'chain' | 'demo';
};

export type MyGrantsSummary = {
  totalGrants: number;
  activeGrants: number;
  completedGrants: number;
  totalUsdcEarned: number;
  totalUsdcForfeited: number;
};

export type MyGrantSortOption = 'newest' | 'oldest' | 'highest_value' | 'most_milestones';

export type MyGrantFilterPill =
  | 'all'
  | 'active'
  | 'completed'
  | 'slashed'
  | 'warning_issued'
  | 'streaming';

export type MyGrantEarningsRow = {
  grantId: string;
  totalEarned: number;
  totalForfeited: number;
  netEarnings: number;
  deliveryRatePercent: number | null;
};

export type MonthlyEarningsPoint = {
  monthKey: string;
  label: string;
  earned: number;
};
