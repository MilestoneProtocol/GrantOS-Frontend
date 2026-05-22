'use client';

import { getPublicApiV1Base } from '@/lib/api-config';
import {
  grantEscrowAbi,
  MILESTONE_STATUS_APPROVED,
  MILESTONE_STATUS_PENDING,
  MILESTONE_STATUS_REJECTED,
  MILESTONE_STATUS_SLASHED,
  MILESTONE_STATUS_STREAMING,
  MILESTONE_STATUS_SUBMITTED,
} from '@/lib/escrow';
import { USDC_DECIMALS } from '@/lib/usdc';
import type {
  CommitteeDemoGrant,
  CommitteeDemoMilestone,
  CommitteeMilestoneStatus,
} from '@/demo/committee-demo';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

type BackendCommitteeGrant = {
  onChainId: number;
  escrowAddress: `0x${string}`;
  grantorAddress?: `0x${string}`;
  granteeAddress?: `0x${string}`;
  title?: string;
  totalUsdc?: string | number;
};

type OnchainMilestone = {
  title: string;
  description: string;
  amount: bigint;
  deadline: bigint;
  proofType: number;
  state: number;
};

type OnchainGrantView = {
  builder: `0x${string}`;
  streaming: boolean;
  committee: readonly `0x${string}`[];
  quorum: bigint;
  createdAt: bigint;
  milestones: readonly OnchainMilestone[];
};

function mapMilestoneState(state: number): CommitteeMilestoneStatus {
  switch (state) {
    case MILESTONE_STATUS_APPROVED:
    case MILESTONE_STATUS_STREAMING:
      return 'completed';
    case MILESTONE_STATUS_SUBMITTED:
      return 'submitted';
    case MILESTONE_STATUS_REJECTED:
    case MILESTONE_STATUS_SLASHED:
      return 'rejected';
    case MILESTONE_STATUS_PENDING:
    default:
      return 'not_started';
  }
}

/**
 * Fetches grants where the connected wallet is on the committee, enriched with
 * the on-chain `getGrant()` view so we have milestone state, totals, and the
 * canonical builder address. Pure read; safe to call from any committee page.
 */
export function useCommitteeGrants() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const query = useQuery({
    queryKey: ['committee-grants', address],
    queryFn: async () => {
      if (!address || !publicClient) {
        return {
          grants: [] as CommitteeDemoGrant[],
          totalActiveGrants: 0,
          usdcUnderControl: 0,
        };
      }

      const apiBase = getPublicApiV1Base();
      const res = await fetch(
        `${apiBase}/grants/committee?address=${address}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch committee grants: ${res.status}`);
      }
      const backendGrants = (await res.json()) as BackendCommitteeGrant[];
      if (!Array.isArray(backendGrants) || backendGrants.length === 0) {
        return {
          grants: [] as CommitteeDemoGrant[],
          totalActiveGrants: 0,
          usdcUnderControl: 0,
        };
      }

      const enriched = await Promise.all(
        backendGrants.map(async (bg): Promise<CommitteeDemoGrant | null> => {
          if (!bg.escrowAddress) return null;
          try {
            const onchain = (await publicClient.readContract({
              address: bg.escrowAddress,
              abi: grantEscrowAbi,
              functionName: 'getGrant',
            })) as OnchainGrantView;

            const milestones = onchain.milestones ?? [];

            // The "current" milestone is the first one not yet completed.
            let currentMarked = false;
            const mappedMilestones: CommitteeDemoMilestone[] = milestones.map(
              (m, i) => {
                let status = mapMilestoneState(m.state);
                if (status === 'not_started' && !currentMarked) {
                  status = 'building';
                  currentMarked = true;
                }
                return {
                  label: `M${i + 1}`,
                  title: m.title || `Milestone ${i + 1}`,
                  status,
                };
              },
            );

            const milestonesTotal = milestones.length;
            const milestonesCompleted = milestones.filter(
              (m) =>
                m.state === MILESTONE_STATUS_APPROVED ||
                m.state === MILESTONE_STATUS_STREAMING,
            ).length;

            const totalAllocation = milestones.reduce(
              (sum, m) => sum + Number(formatUnits(m.amount ?? 0n, USDC_DECIMALS)),
              0,
            );

            const allCompleted =
              milestonesTotal > 0 && milestonesCompleted === milestonesTotal;

            return {
              id: String(bg.onChainId),
              title: bg.title || `Grant #${bg.onChainId}`,
              builder: (onchain.builder ??
                bg.granteeAddress ??
                '0x0000000000000000000000000000000000000000') as `0x${string}`,
              totalAllocation,
              milestonesTotal,
              milestonesCompleted,
              status: allCompleted ? 'completed' : 'in_progress',
              milestones: mappedMilestones,
            };
          } catch (err) {
            console.error(
              `useCommitteeGrants: failed to read grant at ${bg.escrowAddress}:`,
              err,
            );
            return null;
          }
        }),
      );

      const grants = enriched.filter(
        (g): g is CommitteeDemoGrant => g !== null,
      );
      const totalActiveGrants = grants.filter(
        (g) => g.status === 'in_progress',
      ).length;
      const usdcUnderControl = grants.reduce(
        (sum, g) => sum + g.totalAllocation,
        0,
      );

      return { grants, totalActiveGrants, usdcUnderControl };
    },
    enabled: Boolean(address && publicClient),
    staleTime: 15_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    grants: query.data?.grants ?? [],
    totalActiveGrants: query.data?.totalActiveGrants ?? 0,
    usdcUnderControl: query.data?.usdcUnderControl ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
