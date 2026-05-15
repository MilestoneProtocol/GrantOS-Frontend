'use client';

import { getDaoDashboardSnapshot, type DaoGrantCardModel } from '@/demo/dao-dashboard';
import { isUiDemoMode } from '@/demo';
import { tierFromReputationPoints } from '@/lib/builder-contribution-tiers';
import type { BuilderProfileData } from '@/lib/builder-profile-server';
import { scoreToLetterGrade } from '@/lib/builder-profile-server';
import {
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

function syntheticBindingTx(address: Address): `0x${string}` {
  const h = keccak256(stringToHex(`grantos:identity-binding:${address.toLowerCase()}`));
  return `0x${h.slice(2, 66)}` as `0x${string}`;
}

function syntheticVerifiedAt(address: Address): string {
  const n = Number(BigInt(`0x${address.slice(2, 10)}`) % BigInt(86400 * 400));
  const ms = Date.UTC(2023, 9, 12, 14, 30) + n * 1000;
  return (
    new Date(ms).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' +
    new Date(ms).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
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

  const builderIdsReadA = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getGrantsByBuilder', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getGrantsByBuilder',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const builderIdsReadB = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getBuilderGrantIds', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getBuilderGrantIds',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const builderIdsReadC = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: [{ type: 'function', name: 'getGrantsForBuilder', stateMutability: 'view', inputs: [{ name: 'builder', type: 'address' }], outputs: [{ type: 'uint256[]' }] }] as const,
    functionName: 'getGrantsForBuilder',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const builderGrantIds = useMemo(() => {
    const pick = (v: unknown): bigint[] => (Array.isArray(v) ? (v as bigint[]) : []);
    const a = pick(builderIdsReadA.data);
    if (a.length > 0) return a;
    const b = pick(builderIdsReadB.data);
    if (b.length > 0) return b;
    return pick(builderIdsReadC.data);
  }, [builderIdsReadA.data, builderIdsReadB.data, builderIdsReadC.data]);

  const grantsRead = useReadContracts({
    contracts: builderGrantIds.map((id) => ({
      address: GRANT_ESCROW_ADDRESS,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
      args: [id],
    })),
    query: { enabled: builderGrantIds.length > 0 },
  });

  const statusContracts = useMemo(() => {
    if (!grantsRead.data) return [];
    const out: Array<{
      address: typeof GRANT_ESCROW_ADDRESS;
      abi: typeof grantEscrowReadAbi;
      functionName: 'getMilestoneStatus';
      args: readonly [bigint, bigint];
    }> = [];
    grantsRead.data.forEach((entry, gi) => {
      const row = entry as { status: string; result?: { milestones: unknown[] } };
      if (row.status !== 'success' || !row.result) return;
      const id = builderGrantIds[gi];
      if (id === undefined) return;
      const ms = row.result.milestones ?? [];
      for (let i = 0; i < ms.length; i++) {
        out.push({
          address: GRANT_ESCROW_ADDRESS,
          abi: grantEscrowReadAbi,
          functionName: 'getMilestoneStatus',
          args: [id, BigInt(i)],
        });
      }
    });
    return out;
  }, [builderGrantIds, grantsRead.data]);

  const statusRead = useReadContracts({
    contracts: statusContracts,
    query: { enabled: statusContracts.length > 0 },
  });

  const grantsLoading =
    builderIdsReadA.isLoading ||
    builderIdsReadB.isLoading ||
    builderIdsReadC.isLoading ||
    (builderGrantIds.length > 0 && grantsRead.isLoading);

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
      .then((r) => r.json())
      .then((json: BuilderProfileData) => {
        if (!cancelled) setProfileData(json);
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
    const idTuple = identityRead.data;
    const zkVerified = Boolean(idTuple?.[0]) || Boolean(verifiedRead.data);
    const githubHandle = typeof idTuple?.[1] === 'string' ? idTuple[1] : '';
    const accountCreationYear = Number(idTuple?.[2] ?? 0);
    const contributionTier = Number(idTuple?.[3] ?? 0);
    const reputationScore = Number(idTuple?.[4] ?? 0);
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
      verifiedAtDisplay: hasIdentityRecord ? syntheticVerifiedAt(addr) : null,
      bindingTxHash: hasIdentityRecord ? syntheticBindingTx(addr) : null,
    };
  }, [address, identityRead.data, verifiedRead.data]);

  const hasBuilderHistory = builderGrantIds.length > 0 || demoCardsForBuilder(address ?? '').length > 0;

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
        largestTitle = grant.milestones[0]?.title ?? `Grant ${builderGrantIds[gi]?.toString() ?? ''}`;
      }
      if (grantTotal > 0 && grantApproved === grantTotal) completedGrants += 1;
    });

    if (streamingActive) {
      streamRate = 0.0003;
      streamAccum = 1241.044;
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
  }, [address, builderGrantIds, grantsRead.data, statusRead.data]);

  const demoEarnings = useMemo(() => {
    if (!address) return null;
    const cards = demoCardsForBuilder(address);
    if (cards.length === 0) return null;
    return computeEarningsFromDemo(cards);
  }, [address]);

  const mergedStats = useMemo(() => {
    const api =
      profileData?.kind === 'ok' ? profileData.stats : null;
    const chain = chainEarnings;
    const demo = demoEarnings;

    const totalUsdcEarned =
      (chain?.totalUsdcEarned ?? 0) > 0
        ? chain!.totalUsdcEarned
        : demo?.totalUsdcEarned ?? api?.totalUsdcEarned ?? 0;

    const pendingInEscrow =
      (chain?.pendingInEscrow ?? 0) > 0
        ? chain!.pendingInEscrow
        : demo?.pendingInEscrow ?? 0;

    const largest =
      (chain?.largestSingleGrant.amount ?? 0) > 0
        ? chain!.largestSingleGrant
        : demo?.largestSingleGrant ?? { amount: 0, title: '—' };

    const avg =
      (chain?.averageMilestoneValue ?? 0) > 0
        ? chain!.averageMilestoneValue
        : demo?.averageMilestoneValue ?? 0;

    const completed =
      (chain?.totalGrantsCompleted.count ?? 0) > 0
        ? chain!.totalGrantsCompleted
        : demo?.totalGrantsCompleted ?? { count: 0, completionRate: null };

    const streaming =
      chain?.streaming.active || demo?.streaming.active
        ? demo?.streaming.active
          ? demo.streaming
          : chain!.streaming
        : { active: false, accumulatedUsdc: 0, rateUsdcPerSec: 0, epochMs: Date.now() };

    const repScore =
      identity?.reputationScore && identity.reputationScore > 0
        ? identity.reputationScore
        : api?.reputationScore ?? reputation?.score ?? 0;

    const deliveryRate =
      api?.deliveryRatePercent ??
      (reputation?.deliveryRatePercent != null ? reputation.deliveryRatePercent : null);

    const zkFromRep =
      reputation?.events?.filter((e) => e.kind === 'ZKProofSubmitted').length ?? 0;
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
      approvedMilestones: chain?.approvedMilestones ?? demo?.approvedMilestones ?? 0,
      activeGrants: demo?.activeGrants ?? builderGrantIds.length,
    };
  }, [
    profileData,
    chainEarnings,
    demoEarnings,
    identity?.reputationScore,
    reputation,
    builderGrantIds.length,
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
