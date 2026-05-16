import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { GRANT_FACTORY_ADDRESS, committeeMembershipAbis, grantEscrowAbi, GRANT_ESCROW_ADDRESS } from '@/lib/escrow';
import type { CommitteeReviewSubmission, CommitteeReviewsView } from '@/demo/committee-demo';
import { formatUnits } from 'viem';
import { USDC_DECIMALS } from '@/lib/usdc';

export function useCommitteeReviews() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommitteeReviewsView>({
    totalPending: 0,
    tabCounts: { pending: 0, approved: 0, rejected: 0 },
    pending: [],
    approved: [],
    rejected: [],
  });

  useEffect(() => {
    if (!address || !publicClient) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get all grants where caller is a committee member
        // In a real factory, we'd have a mapping. For the hackathon, we assume 
        // the backend or a specific contract view helps us.
        // We'll use the backend to find grants for the committee member.
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        
        // 1. Get all grants where caller is a committee member
        const grantsRes = await fetch(`${apiBase}/grants/committee?address=${address}`);
        if (!grantsRes.ok) throw new Error(`Failed to fetch committee grants: ${grantsRes.status}`);
        const grants = await grantsRes.json();
        const grantIds = grants.map((g: any) => g.onChainId);

        if (grantIds.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch pending submissions from backend
        const submissionsRes = await fetch(`${apiBase}/milestones/committee?grantIds=${grantIds.join(',')}`);
        if (!submissionsRes.ok) throw new Error(`Failed to fetch committee submissions: ${submissionsRes.status}`);
        const rawSubmissions = await submissionsRes.json();

        // 3. Map to UI structure
        const mappedSubmissions: CommitteeReviewSubmission[] = await Promise.all(rawSubmissions.map(async (s: any) => {
          // Fetch real-time vote count from contract
          const submissionData: any = await publicClient.readContract({
            address: s.escrowAddress,
            abi: grantEscrowAbi,
            functionName: 'getSubmission',
            args: [BigInt(s.milestoneIndex)],
          });

          const hasVoted = await publicClient.readContract({
            address: s.escrowAddress,
            abi: grantEscrowAbi,
            functionName: 'hasVoted',
            args: [BigInt(s.milestoneIndex), address],
          });

          const quorum = await publicClient.readContract({
              address: s.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'quorum',
          });

          return {
            id: s.id.toString(),
            grantId: `#${s.grantId}`,
            grantTitle: `Grant #${s.grantId}`, // Ideally fetch from backend
            escrowAddress: s.escrowAddress,
            builder: s.builderAddress,
            milestoneIndex: s.milestoneIndex,
            milestoneTitle: `Milestone ${s.milestoneIndex + 1}`,
            payoutUsdc: 0, // Should be fetched from contract/backend
            payoutMode: 'lump_sum',
            zkVerified: s.zkVerified,
            aiVerdictSummary: s.aiExplanation || 'No AI verdict available.',
            aiVerdictTags: s.aiVerdict ? [{ label: s.aiVerdict, tone: s.aiVerdict === 'LIKELY_FULFILLED' ? 'positive' : 'neutral' }] : [],
            builderSummary: s.builderSummary,
            githubPrUrl: s.prUrl,
            committeeRequired: Number(quorum),
            approvers: [], // Simplified for now
            currentMemberVoted: Boolean(hasVoted),
            finalOutcome: s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : undefined,
          };
        }));

        setData({
          totalPending: mappedSubmissions.filter(s => !s.finalOutcome).length,
          tabCounts: {
            pending: mappedSubmissions.filter(s => !s.finalOutcome).length,
            approved: mappedSubmissions.filter(s => s.finalOutcome === 'approved').length,
            rejected: mappedSubmissions.filter(s => s.finalOutcome === 'rejected').length,
          },
          pending: mappedSubmissions.filter(s => !s.finalOutcome),
          approved: mappedSubmissions.filter(s => s.finalOutcome === 'approved'),
          rejected: mappedSubmissions.filter(s => s.finalOutcome === 'rejected'),
        });
      } catch (err) {
        console.error('Failed to fetch committee reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, publicClient]);

  return { loading, data, refresh: () => {} };
}
