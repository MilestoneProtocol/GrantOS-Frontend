'use client';

import { getDaoDashboardSnapshot, type DaoGrantCardModel } from '@/demo/dao-dashboard';
import { isUiDemoMode } from '@/demo';
import { tierFromReputationPoints } from '@/lib/builder-contribution-tiers';
import type { BuilderProfileData } from '@/lib/builder-profile-server';
import { scoreToLetterGrade } from '@/lib/builder-profile-server';
import {
  GRANT_FACTORY_ADDRESS,
  grantFactoryAbi,
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import type { ReputationResult } from '@/lib/reputation';
import { USDC_DECIMALS } from '@/lib/usdc';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, keccak256, stringToHex, type Address } from 'viem';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';

const MILESTONE_PENDING = 0;
const MILESTONE_APPROVED_LIKE = new Set([3, 4, 5]);

export type BuilderIdentitySnapshot = {
  zkVerified: boolean;
  githubHandle: string;
  accountCreationYear: number;
  contributionTier: number;
  reputationScore: number;
  hasIdentityRecord: boolean;
  verifiedAtDisplay: string | null;
  bindingTxHash: `0x${string}` | null;
};

export type EarningsStatSlice<T> = {
  loading: boolean;
  value: T;
};

export type BuilderEarningsStats = {
  totalUsdcEarned: EarningsStatSlice<number>;
  currentlyStreaming: EarningsStatSlice<{
    active: boolean;
    accumulatedUsdc: number;
    rateUsdcPerSec: number;
    epochMs: number;
  }>;
  pendingInEscrow: EarningsStatSlice<number>;
  largestSingleGrant: EarningsStatSlice<{ amount: number; title: string }>;
  averageMilestoneValue: EarningsStatSlice<number>;
  totalGrantsCompleted: EarningsStatSlice<{ count: number; completionRate: number | null }>;
};

function usdcFromWei(w: bigint): number {
  return Number(formatUnits(w, USDC_DECIMALS));
}



function demoCardsForBuilder(address: string): DaoGrantCardModel[] {
  if (!isUiDemoMode()) return [];
  const snap = getDaoDashboardSnapshot(0);
  return snap.grants.filter((g) => g.builder.toLowerCase() === address.toLowerCase());
}

function computeStreamingFromDemo(cards: DaoGrantCardModel[]) {
  let rate = 0;
  let accumulated = 0;
  let epochMs = Date.now();
  let active = false;
  for (const c of cards) {
    if (!c.isStreamingActive) continue;
    active = true;
    rate += c.streamRateUsdcPerSec;
    const elapsed = (Date.now() - c.streamEpochMs) / 1000;
    accumulated += c.streamAccumulatedUsdcAtEpoch + elapsed * c.streamRateUsdcPerSec;
    epochMs = Math.min(epochMs, c.streamEpochMs);
  }
  return { active, accumulatedUsdc: accumulated, rateUsdcPerSec: rate, epochMs };
}

function computeEarningsFromDemo(cards: DaoGrantCardModel[]) {
  let totalEarned = 0;
  let approvedCount = 0;
  let pendingEscrow = 0;
  let largest = 0;
  let largestTitle = '—';
  let completedGrants = 0;
  let activeGrantEscrowLocks = 0;

  for (const c of cards) {
    let grantEarned = 0;
    let allApproved = c.milestoneTotal > 0 && c.milestoneCompleted === c.milestoneTotal;
    for (const m of c.milestones) {
      if (m.status === 'approved') {
        totalEarned += m.amountUsdc;
        grantEarned += m.amountUsdc;
        approvedCount += 1;
      } else if (m.status === 'pending' || m.status === 'overdue') {
        pendingEscrow += m.amountUsdc;
        activeGrantEscrowLocks += 1;
      }
    }
    if (c.totalGrantUsdc > largest) {
      largest = c.totalGrantUsdc;
      largestTitle = c.milestones[0]?.title ?? c.displayId;
    }
    if (allApproved && c.tags.includes('completed')) completedGrants += 1;
  }

  const activeGrants = new Set(
    cards.filter((c) => c.tags.includes('active')).map((c) => c.slug),
  ).size;

  return {
    totalUsdcEarned: Math.round(totalEarned * 100) / 100,
    pendingInEscrow: Math.round(pendingEscrow * 100) / 100,
    largestSingleGrant: { amount: largest, title: largestTitle },
    averageMilestoneValue:
      approvedCount > 0 ? Math.round((totalEarned / approvedCount) * 100) / 100 : 0,
    totalGrantsCompleted: {
      count: completedGrants,
      completionRate:
        cards.length > 0 ? Math.round((completedGrants / cards.length) * 1000) / 10 : null,
    },
    activeGrants: activeGrants || activeGrantEscrowLocks,
    approvedMilestones: approvedCount,
    streaming: computeStreamingFromDemo(cards),
  };
}

export function useBuilderPrivateProfile() {
  const { address } = useAccount();
  const [profileData, setProfileData] = useState<BuilderProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reputation, setReputation] = useState<ReputationResult | null>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  const identityRead = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const verifiedRead = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: countData, isLoading: isCountLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
  });

  const grantCount = Number(countData || BigInt(0));

  const factoryGrantContracts = useMemo(() => {
    return Array.from({ length: grantCount }, (_, i) => ({
      address: GRANT_FACTORY_ADDRESS,
      abi: grantFactoryAbi,
      functionName: 'grants',
      args: [BigInt(i)],
    }));
  }, [grantCount]);

  const { data: escrowAddressesData, isLoading: isAddressesLoading } = useReadContracts({
    contracts: factoryGrantContracts,
    query: { enabled: grantCount > 0 },
  });

  const escrowAddresses = useMemo(() => {
    if (!escrowAddressesData) return [];
    return escrowAddressesData.map((r: any) =>
      r.status === 'success' && r.result ? r.result : '0x0000000000000000000000000000000000000000',
    );
  }, [escrowAddressesData]);

  const grantContracts = useMemo(() => {
    return escrowAddresses.map((addr) => ({
      address: addr as Address,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
    }));
  }, [escrowAddresses]);

  const grantsRead = useReadContracts({
    contracts: grantContracts,
    query: { enabled: grantContracts.length > 0 },
  });

  const statusContracts = useMemo(() => {
    if (!grantsRead.data) return [];
    const out: Array<{
      address: Address;
      abi: typeof grantEscrowReadAbi;
      functionName: 'getMilestoneStatus';
      args: readonly [bigint];
    }> = [];
    grantsRead.data.forEach((entry, gi) => {
      const row = entry as { status: string; result?: { milestones: unknown[] } };
      if (row.status !== 'success' || !row.result) return;
      const addr = escrowAddresses[gi];
      if (!addr || addr === '0x0000000000000000000000000000000000000000') return;
      const ms = row.result.milestones ?? [];
      for (let i = 0; i < ms.length; i++) {
        out.push({
          address: addr as Address,
          abi: grantEscrowReadAbi,
          functionName: 'getMilestoneStatus',
          args: [BigInt(i)],
        });
      }
    });
    return out;
  }, [escrowAddresses, grantsRead.data]);

  const statusRead = useReadContracts({
    contracts: statusContracts,
    query: { enabled: statusContracts.length > 0 },
  });

  const grantsLoading =
    isCountLoading ||
    isAddressesLoading ||
    (grantContracts.length > 0 && grantsRead.isLoading);

  const statusesLoading = statusContracts.length > 0 && statusRead.isLoading;

  const identityLoading = identityRead.isLoading || verifiedRead.isLoading;

  useEffect(() => {
    if (!address) {
      setProfileData(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    fetch(`/api/builder-profile/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: BuilderProfileData | null) => {
        if (!cancelled && json) setProfileData(json);
      })
      .catch(() => {
        if (!cancelled) setProfileData(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!address) {
      setReputation(null);
      return;
    }
    let cancelled = false;
    setReputationLoading(true);
    fetch(`/api/reputation/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ReputationResult | null) => {
        if (!cancelled) setReputation(json);
      })
      .catch(() => {
        if (!cancelled) setReputation(null);
      })
      .finally(() => {
        if (!cancelled) setReputationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const identity = useMemo((): BuilderIdentitySnapshot | null => {
    if (!address) return null;
    const idTuple = identityRead.data as { isVerified?: boolean, githubHandle?: string, createdYear?: bigint, tier?: bigint } | undefined;
    const zkVerified = Boolean(idTuple?.isVerified) || Boolean(verifiedRead.data);
    const githubHandle = typeof idTuple?.githubHandle === 'string' ? idTuple.githubHandle : '';
    const accountCreationYear = Number(idTuple?.createdYear ?? 0);
    const contributionTier = Number(idTuple?.tier ?? 0);
    const reputationScore = 0;
    const hasIdentityRecord =
      zkVerified ||
      githubHandle.trim().length > 0 ||
      accountCreationYear > 0 ||
      contributionTier > 0 ||
      reputationScore > 0;

    const addr = address as Address;
    return {
      zkVerified,
      githubHandle,
      accountCreationYear,
      contributionTier,
      reputationScore,
      hasIdentityRecord,
      verifiedAtDisplay: null,
      bindingTxHash: null,
    };
  }, [address, identityRead.data, verifiedRead.data]);

  const hasBuilderHistory = escrowAddresses.length > 0 || demoCardsForBuilder(address ?? '').length > 0;

  const hasProfileContent =
    Boolean(identity?.hasIdentityRecord) ||
    hasBuilderHistory ||
    (profileData?.kind === 'ok' &&
      (profileData.hasIdentityRecord || profileData.grants.length > 0));

  const chainEarnings = useMemo(() => {
    if (!address || !grantsRead.data) {
      return null;
    }
    let totalEarned = 0;
    let approvedCount = 0;
    let pendingEscrow = 0;
    let largest = 0;
    let largestTitle = '—';
    let completedGrants = 0;
    let grantCount = 0;
    let streamingActive = false;
    let streamRate = 0;
    let streamAccum = 0;
    let statusIdx = 0;

    grantsRead.data.forEach((entry, gi) => {
      const row = entry as {
        status: string;
        result?: {
          builder: Address;
          streaming: boolean;
          milestones: Array<{ title: string; amount: bigint }>;
        };
      };
      if (row.status !== 'success' || !row.result) return;
      if (row.result.builder.toLowerCase() !== address.toLowerCase()) return;
      grantCount += 1;
      const grant = row.result;
      if (grant.streaming) streamingActive = true;

      let grantApproved = 0;
      let grantTotal = grant.milestones.length;
      let grantEarned = 0;

      grant.milestones.forEach((m, mi) => {
        const stRow = statusRead.data?.[statusIdx];
        statusIdx += 1;
        const st =
          stRow?.status === 'success' ? Number(stRow.result) : MILESTONE_PENDING;
        if (st !== MILESTONE_PENDING) {
          if (MILESTONE_APPROVED_LIKE.has(st)) {
            const usdc = usdcFromWei(m.amount);
            totalEarned += usdc;
            grantEarned += usdc;
            approvedCount += 1;
            grantApproved += 1;
          }
        } else {
          pendingEscrow += usdcFromWei(m.amount);
        }
      });

      const grantUsdc = grant.milestones.reduce((s, m) => s + usdcFromWei(m.amount), 0);
      if (grantUsdc > largest) {
        largest = grantUsdc;
        largestTitle = grant.milestones[0]?.title ?? `Grant ${gi}`;
      }
      if (grantTotal > 0 && grantApproved === grantTotal) completedGrants += 1;
    });

    if (streamingActive) {
      streamRate = 0;
      streamAccum = 0;
    }

    return {
      totalUsdcEarned: Math.round(totalEarned * 100) / 100,
      pendingInEscrow: Math.round(pendingEscrow * 100) / 100,
      largestSingleGrant: { amount: largest, title: largestTitle },
      averageMilestoneValue:
        approvedCount > 0 ? Math.round((totalEarned / approvedCount) * 100) / 100 : 0,
      totalGrantsCompleted: {
        count: completedGrants,
        completionRate:
          grantCount > 0 ? Math.round((completedGrants / grantCount) * 1000) / 10 : null,
      },
      approvedMilestones: approvedCount,
      streaming: {
        active: streamingActive,
        accumulatedUsdc: streamAccum,
        rateUsdcPerSec: streamRate,
        epochMs: Date.now() - 45 * 60 * 1000,
      },
    };
  }, [address, escrowAddresses, grantsRead.data, statusRead.data]);

  const demoEarnings = useMemo(() => {
    if (!address) return null;
    const cards = demoCardsForBuilder(address);
    if (cards.length === 0) return null;
    return computeEarningsFromDemo(cards);
  }, [address]);

  const mergedStats = useMemo(() => {
    const api = profileData?.kind === 'ok' ? profileData.stats : null;
    const chain = chainEarnings;

    const totalUsdcEarned = (chain?.totalUsdcEarned ?? 0) > 0 ? chain!.totalUsdcEarned : api?.totalUsdcEarned ?? 0;
    const pendingInEscrow = (chain?.pendingInEscrow ?? 0) > 0 ? chain!.pendingInEscrow : 0;
    const largest = (chain?.largestSingleGrant.amount ?? 0) > 0 ? chain!.largestSingleGrant : { amount: 0, title: '—' };
    const avg = (chain?.averageMilestoneValue ?? 0) > 0 ? chain!.averageMilestoneValue : 0;
    const completed = (chain?.totalGrantsCompleted.count ?? 0) > 0 ? chain!.totalGrantsCompleted : { count: 0, completionRate: null };
    const streaming = chain?.streaming.active 
      ? chain!.streaming 
      : { active: false, accumulatedUsdc: 0, rateUsdcPerSec: 0, epochMs: Date.now() };

    const repScore = identity?.reputationScore && identity.reputationScore > 0 ? identity.reputationScore : api?.reputationScore ?? reputation?.score ?? 0;
    const deliveryRate = api?.deliveryRatePercent ?? (reputation?.deliveryRatePercent != null ? reputation.deliveryRatePercent : null);
    const zkFromRep = reputation?.events?.filter((e) => e.kind === 'ZKProofSubmitted').length ?? 0;
    const zkProofs = Math.max(api?.zkProofsSubmitted ?? 0, zkFromRep);

    return {
      reputationScore: repScore,
      letterGrade: repScore > 0 ? scoreToLetterGrade(repScore) : '—',
      deliveryRatePercent: deliveryRate,
      zkProofsSubmitted: zkProofs,
      totalUsdcEarned,
      pendingInEscrow,
      largestSingleGrant: largest,
      averageMilestoneValue: avg,
      totalGrantsCompleted: completed,
      streaming,
      approvedMilestones: chain?.approvedMilestones ?? 0,
      activeGrants: escrowAddresses.length,
    };
  }, [
    profileData,
    chainEarnings,
    identity?.reputationScore,
    reputation,
    escrowAddresses.length,
  ]);

  const earnings: BuilderEarningsStats = useMemo(
    () => ({
      totalUsdcEarned: {
        loading: grantsLoading || statusesLoading,
        value: mergedStats.totalUsdcEarned,
      },
      currentlyStreaming: {
        loading: grantsLoading,
        value: mergedStats.streaming,
      },
      pendingInEscrow: {
        loading: grantsLoading || statusesLoading,
        value: mergedStats.pendingInEscrow,
      },
      largestSingleGrant: {
        loading: grantsLoading,
        value: mergedStats.largestSingleGrant,
      },
      averageMilestoneValue: {
        loading: grantsLoading || statusesLoading,
        value: mergedStats.averageMilestoneValue,
      },
      totalGrantsCompleted: {
        loading: grantsLoading || statusesLoading,
        value: mergedStats.totalGrantsCompleted,
      },
    }),
    [grantsLoading, statusesLoading, mergedStats],
  );

  const contributionTier = tierFromReputationPoints(mergedStats.reputationScore);

  const computeStreamTotal = useCallback(() => {
    const s = mergedStats.streaming;
    if (!s.active) return s.accumulatedUsdc;
    const elapsed = (Date.now() - s.epochMs) / 1000;
    return s.accumulatedUsdc + elapsed * s.rateUsdcPerSec;
  }, [mergedStats.streaming]);

  return {
    address,
    identity,
    identityLoading,
    hasProfileContent,
    hasBuilderHistory,
    profileData,
    profileLoading,
    reputation,
    reputationLoading,
    earnings,
    stats: mergedStats,
    contributionTier,
    computeStreamTotal,
  };
}
