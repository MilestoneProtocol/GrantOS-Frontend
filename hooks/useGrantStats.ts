import { useQuery } from '@tanstack/react-query';

export type DashboardStats = {
  totalUsdcLocked: number;
  activeGrants: number;
  milestonesDueThisWeek: number;
  totalReleasedThisMonth: number;
  liveSlashCounterUsdc: number;
  totalZkProofsVerified: number;
};

export type GrantDetailStats = {
  totalMilestones: number;
  completedMilestones: number;
  submittedMilestones: number;
  pendingMilestones: number;
  rejectedMilestones: number;
  slashedMilestones: number;
  isStreaming: boolean;
  zkProofsVerified: number;
  warningsIssued: number;
  slashesExecuted: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useDashboardStats(refetchInterval = 30000) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grants/stats/dashboard`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
    refetchInterval,
  });
}

export function useGrantDetailStats(grantId: number) {
  return useQuery<GrantDetailStats>({
    queryKey: ['grant-stats', grantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grants/${grantId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch grant stats');
      return res.json();
    },
    enabled: grantId >= 0,
  });
}
