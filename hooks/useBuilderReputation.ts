import { useQuery } from '@tanstack/react-query';

export type ReputationScore = {
  score: number;
  letterGrade: string;
  deliveryRate: number;
  zkVerified: boolean;
  breakdown: {
    approvedOnTime: number;
    approvedLate: number;
    zkProofsSubmitted: number;
    rejected: number;
    warningsReceived: number;
    slashed: number;
    totalPoints: number;
  };
  history: Array<{
    grantId: number;
    milestoneIndex: number;
    milestoneTitle: string;
    outcome: 'approved_on_time' | 'approved_late' | 'rejected' | 'warned' | 'slashed' | 'pending';
    points: number;
    zkProofSubmitted: boolean;
    submittedAt: string | null;
    deadline: string;
    easAttestationUid: string | null;
    txHash: string | null;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useBuilderReputation(address: string | null) {
  return useQuery<ReputationScore>({
    queryKey: ['builder-reputation', address],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grants/builder/${address}/reputation`);
      if (!res.ok) throw new Error('Failed to fetch reputation');
      return res.json();
    },
    enabled: Boolean(address),
    staleTime: 30000,
  });
}
