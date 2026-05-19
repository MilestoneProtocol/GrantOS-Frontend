import { useQuery } from '@tanstack/react-query';

export type EnrichedGrant = {
  onChainId: number;
  escrowAddress: string;
  grantorAddress: string;
  granteeAddress: string;
  totalUsdc: string;
  isStreaming: boolean;
  quorum: number;
  committee: string[];
  milestones: any[];
  completedMilestones: number;
  submittedMilestones: number;
  pendingMilestones: number;
  zkProofsVerified: number;
  hasWarning: boolean;
  hasSlashed: boolean;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useEnrichedGrants() {
  return useQuery<EnrichedGrant[]>({
    queryKey: ['enriched-grants'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grants?enriched=true`);
      if (!res.ok) throw new Error('Failed to fetch enriched grants');
      return res.json();
    },
    refetchInterval: 30000,
  });
}
