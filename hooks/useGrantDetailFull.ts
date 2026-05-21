import { getPublicApiV1Base } from '@/lib/api-config';
import { useQuery } from '@tanstack/react-query';

export type GrantSubmission = {
  id: number;
  builderSummary: string;
  prUrl: string | null;
  zkVerified: boolean;
  proofHash: string | null;
  easAttestationUid: string | null;
  aiVerdict: string | null;
  aiExplanation: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  approvalCount: number;
  rejectionCount: number;
  submissionTxHash: string | null;
  createdAt: string;
};

export type GrantWarning = {
  id: number;
  committeeAddress: string;
  message: string;
  attestationUid: string;
  txHash: string;
  warningTimestamp: string;
  slashUnlocksAt: string;
  slashed: boolean;
  slashedAt: string | null;
  slashTxHash: string | null;
  amountReturnedUsdc: string | null;
  createdAt: string;
};

export type EnrichedMilestone = {
  title: string;
  description: string;
  amount: string;
  deadline: string;
  proofType: number;
  index: number;
  submission: GrantSubmission | null;
  warnings: GrantWarning[];
};

export type GrantDetailFull = {
  grant: {
    onChainId: number;
    escrowAddress: string;
    grantorAddress: string;
    granteeAddress: string;
    totalUsdc: string;
    isStreaming: boolean;
    quorum: number;
    committee: string[];
    createdAt: string;
    txHash?: string;
  };
  milestones: EnrichedMilestone[];
  warnings: GrantWarning[];
};

const API_BASE = getPublicApiV1Base();

export function useGrantDetailFull(grantId: number | null) {
  return useQuery<GrantDetailFull>({
    queryKey: ['grant-detail-full', grantId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/grants/${grantId}/full`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Grant not found');
        throw new Error('Failed to fetch grant details');
      }
      return res.json();
    },
    enabled: grantId !== null && grantId >= 0,
    retry: false,
  });
}
