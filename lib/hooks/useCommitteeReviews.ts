import { getPublicApiV1Base } from '@/lib/api-config';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { grantEscrowAbi } from '@/lib/escrow';
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
        const apiBase = getPublicApiV1Base();
        
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
          // Fetch grant data (committee members, milestone amounts) and submission data in parallel
          const [grantData, submissionData, currentMemberVoted, quorum]: [any, any, any, any] = await Promise.all([
            publicClient.readContract({
              address: s.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'getGrant',
            }),
            publicClient.readContract({
              address: s.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'getSubmission',
              args: [BigInt(s.milestoneIndex)],
            }),
            publicClient.readContract({
              address: s.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'hasVoted',
              args: [BigInt(s.milestoneIndex), address],
            }),
            publicClient.readContract({
              address: s.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'quorum',
            }),
          ]);

          // Build the approvers array from the on-chain committee list
          const committeeAddresses: readonly `0x${string}`[] = grantData.committee || [];
          const approvalCount = Number(submissionData.approvalCount || 0n);
          const rejectionCount = Number(submissionData.rejectionCount || 0n);

          // Check which committee members have voted
          const memberVoteStatuses = await Promise.all(
            committeeAddresses.map(async (memberAddr: `0x${string}`) => {
              const voted = await publicClient.readContract({
                address: s.escrowAddress,
                abi: grantEscrowAbi,
                functionName: 'hasVoted',
                args: [BigInt(s.milestoneIndex), memberAddr],
              });
              return { address: memberAddr, voted: Boolean(voted) };
            })
          );

          // Assign vote directions: we know the total approval/rejection counts
          // from the submission data, so distribute among voted members
          let approvalsAssigned = 0;
          const approvers = memberVoteStatuses.map((m) => {
            if (!m.voted) {
              return { address: m.address, status: 'pending' as const };
            }
            // Assign approvals first, then remaining voted members are rejections
            if (approvalsAssigned < approvalCount) {
              approvalsAssigned++;
              return { address: m.address, status: 'approved' as const };
            }
            return { address: m.address, status: 'rejected' as const };
          });

          // Extract payout from the milestone data
          const milestoneAmount = grantData.milestones?.[s.milestoneIndex]?.amount;
          const payoutUsdc = milestoneAmount
            ? Number(formatUnits(milestoneAmount, USDC_DECIMALS))
            : 0;

          return {
            id: s.id.toString(),
            grantId: `#${s.grantId}`,
            grantTitle: s.title || `Grant #${s.grantId}`,
            escrowAddress: s.escrowAddress,
            builder: s.builderAddress,
            milestoneIndex: s.milestoneIndex,
            milestoneTitle: grantData.milestones?.[s.milestoneIndex]?.title || `Milestone ${s.milestoneIndex + 1}`,
            payoutUsdc,
            payoutMode: grantData.streaming ? 'superfluid' : 'lump_sum',
            zkVerified: s.zkVerified,
            aiVerdictSummary: s.aiExplanation || 'No AI verdict available.',
            aiVerdictTags: s.aiVerdict ? [{ label: s.aiVerdict, tone: s.aiVerdict === 'LIKELY_FULFILLED' ? 'positive' : 'neutral' }] : [],
            builderSummary: s.builderSummary,
            githubPrUrl: s.prUrl,
            committeeRequired: Number(quorum),
            approvers,
            currentMemberVoted: Boolean(currentMemberVoted),
            finalOutcome: s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : undefined,
            deadline: grantData.milestones?.[s.milestoneIndex]?.deadline 
              ? Number(grantData.milestones[s.milestoneIndex].deadline) 
              : undefined,
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
