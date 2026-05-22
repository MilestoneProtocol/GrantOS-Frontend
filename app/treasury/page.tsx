'use client';

import CashFlowChart from '@/app/treasury/CashFlowChart';
import EscrowBreakdownTable from '@/app/treasury/EscrowBreakdownTable';
import FinancialOverviewBar from '@/app/treasury/FinancialOverviewBar';
import ProjectedCommitments from '@/app/treasury/ProjectedCommitments';
import SlashRecoveryHistory from '@/app/treasury/SlashRecoveryHistory';
import StreamingOverviewPanel from '@/app/treasury/StreamingOverviewPanel';
import TimeRangeSelector from '@/app/treasury/TimeRangeSelector';
import TreasuryActivityFeed from '@/app/treasury/TreasuryActivityFeed';
import TreasurySkeleton from '@/app/treasury/TreasurySkeleton';
import DaoAccessDeniedToast from '@/components/dao/DaoAccessDeniedToast';
import DaoAppShell from '@/components/dao/DaoAppShell';
import { useAuthGuard } from '@/lib/authGuard';
import { useTreasuryStore } from '@/store/treasuryStore';
import { useEffect, useState, useMemo } from 'react';
import { useWatchContractEvent, useReadContract, useReadContracts } from 'wagmi';
import { useQueries } from '@tanstack/react-query';
import { zeroAddress } from 'viem';
import {
  CONTRACTS_READY,
  GRANT_FACTORY_ADDRESS,
  GRANT_ESCROW_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
  grantFactoryAbi,
  grantEscrowReadAbi,
  identityRegistryAbi,
} from '@/lib/escrow';
import { safeFactoryGrantCount } from '@/lib/grant-factory-read';
import { useEnrichedGrants } from '@/hooks/useEnrichedGrants';
import { useDashboardStats } from '@/hooks/useGrantStats';
import { grantEscrowEventsAbi } from '@/lib/notifications';
import {
  type TreasurySnapshot,
  type EscrowRow,
  type StreamRow,
  type SlashRow,
  type TreasuryEvent,
  type CashFlowPoint,
} from '@/lib/treasury';
import { type GrantDetailFull } from '@/hooks/useGrantDetailFull';

const MIN_VALIDATION_MS = 1500;
const POLL_MS = 30_000;
const SESSION_START_MS = 1779133662312; // stable session start epoch reference

const EMPTY_TREASURY_SNAPSHOT: TreasurySnapshot = {
  hero: {
    totalUsdcLocked: 0,
    totalReleasedAllTime: 0,
    totalRecoveredViaSlashing: 0,
    currentlyStreamingFlowRate: 0,
    totalGrantsCreated: 0,
    averageGrantSizeUsdc: 0,
    sparks: {
      locked: [],
      released: [],
      recovered: [],
      streaming: [],
      grants: [],
      avgSize: [],
    },
    delta: {
      locked: 0,
      released: 0,
      recovered: 0,
      streaming: 0,
      grants: 0,
      avgSize: 0,
    },
  },
  cashFlow: {
    '7D': [],
    '30D': [],
    '90D': [],
    '12M': [],
    'ALL': [],
  },
  escrow: [],
  streams: [],
  slashes: [],
  projections: {
    totalIfApprovedUsdc: 0,
    thisMonthUsdc: 0,
    nextMonthUsdc: 0,
    upcoming: [],
  },
  activity: [],
};

export default function TreasuryPage() {
  const guard = useAuthGuard('dao');
  const snapshot = useTreasuryStore((s) => s.snapshot);
  const setSnapshot = useTreasuryStore((s) => s.setSnapshot);
  const refresh = useTreasuryStore((s) => s.refresh);
  const range = useTreasuryStore((s) => s.range);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Fetch real stats from backend
  const { data: stats } = useDashboardStats(POLL_MS);

  const { data: countData, isLoading: isCountLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
    query: { enabled: CONTRACTS_READY },
  });

  const { data: enrichedGrants, isLoading: isEnrichedLoading } = useEnrichedGrants();
  const grantCount = safeFactoryGrantCount(countData);

  const factoryGrantContracts = useMemo(() => {
    if (!CONTRACTS_READY || grantCount <= 0) return [];
    return Array.from({ length: grantCount }, (_, i) => ({
      address: GRANT_FACTORY_ADDRESS,
      abi: grantFactoryAbi,
      functionName: 'grants',
      args: [BigInt(i)],
    }));
  }, [grantCount]);

  const { data: escrowAddressesData, isLoading: isAddressesLoading } = useReadContracts({
    contracts: factoryGrantContracts,
    query: { enabled: CONTRACTS_READY && grantCount > 0 },
  });

  const escrowAddresses = useMemo(() => {
    if (!escrowAddressesData) return [];
    return escrowAddressesData.map((r: any) =>
      r.status === 'success' && r.result ? r.result : zeroAddress,
    );
  }, [escrowAddressesData]);

  const grantContracts = useMemo(() => {
    return escrowAddresses.map((address) => ({
      address: address as `0x${string}`,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
    }));
  }, [escrowAddresses]);

  const { data: grantsData, isLoading: isGrantsLoading } = useReadContracts({
    contracts: grantContracts,
    query: { enabled: grantContracts.length > 0 },
  });

  const builderAddresses = useMemo(() => {
    if (!grantsData) return [];
    return grantsData.map((r: any) =>
      r.status === 'success' && r.result ? r.result.builder : zeroAddress,
    );
  }, [grantsData]);

  const identityContracts = useMemo(() => {
    return builderAddresses.map((address) => ({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityRegistryAbi,
      functionName: 'getIdentity',
      args: [address],
    }));
  }, [builderAddresses]);

  const { data: identitiesData, isLoading: isIdentitiesLoading } = useReadContracts({
    contracts: identityContracts,
    query: { enabled: builderAddresses.length > 0 },
  });

  const grantDetailQueries = useQueries({
    queries: Array.from({ length: grantCount }, (_, i) => ({
      queryKey: ['grant-detail-full', i],
      queryFn: async () => {
        const res = await fetch(`/api/v1/grants/${i}/full`);
        if (!res.ok) throw new Error('Failed to fetch grant details');
        return res.json();
      },
      enabled: grantCount > 0 && CONTRACTS_READY,
    })),
  });

  const detailsList = useMemo(() => {
    return grantDetailQueries.map((q) => q.data as GrantDetailFull | undefined);
  }, [grantDetailQueries]);

  const mappedSnapshot = useMemo((): TreasurySnapshot => {
    if (!CONTRACTS_READY || !grantsData) return EMPTY_TREASURY_SNAPSHOT;

    const escrowList: EscrowRow[] = [];
    const slashList: SlashRow[] = [];
    const activityList: TreasuryEvent[] = [];

    grantsData.forEach((row: any, i: number) => {
      if (row.status !== 'success' || !row.result) return;
      const g = row.result;
      const identity = (identitiesData?.[i] as any)?.result as
        | { isVerified: boolean; tier: bigint; githubHandle: string }
        | undefined;
      const details = detailsList[i];

      const totalUsdc = Number(
        g.milestones.reduce((s: bigint, m: any) => s + m.amount, BigInt(0)) / BigInt(1000000),
      );

      // Find enriched data from backend
      const enriched = enrichedGrants?.find((eg) => eg.onChainId === i);

      // Compute completed milestones
      const completedMilestones = details?.milestones.filter((m) => m.submission?.status === 'approved') ?? [];
      const releasedUsdc = completedMilestones.reduce((s, m) => s + Number(BigInt(m.amount) / BigInt(1000000)), 0);
      const remainingUsdc = Math.max(0, totalUsdc - releasedUsdc);

      const nextPending = details?.milestones.find((m) => !m.submission || m.submission.status !== 'approved');
      const nextDeadlineMs = nextPending ? Number(nextPending.deadline) * 1000 : null;

      // Risk level
      const overdue = nextDeadlineMs ? SESSION_START_MS > nextDeadlineMs : false;
      const dueSoon = nextDeadlineMs ? (nextDeadlineMs - SESSION_START_MS > 0 && nextDeadlineMs - SESSION_START_MS <= 7 * 24 * 60 * 60 * 1000) : false;
      let riskLevel: 'healthy' | 'watch' | 'at_risk' | 'critical' = 'healthy';
      if (enriched?.hasSlashed || enriched?.hasWarning) riskLevel = 'critical';
      else if (overdue) riskLevel = 'at_risk';
      else if (dueSoon) riskLevel = 'watch';

      const isStreaming = g.streaming && remainingUsdc > 0;
      const streamRateUsdcPerSec = isStreaming ? 0.005 : 0;

      escrowList.push({
        grantId: `GRT-${i}`,
        pathSegment: i.toString(),
        builder: g.builder as `0x${string}`,
        zkVerified: identity?.isVerified ?? false,
        totalEscrowedUsdc: totalUsdc,
        releasedUsdc,
        remainingUsdc,
        paymentMode: g.streaming ? 'streaming' : 'lump_sum',
        nextDeadlineMs,
        riskLevel,
        streamRateUsdcPerSec,
        streamAccumulatedUsdcAtEpoch: 0,
        streamEpochMs: SESSION_START_MS,
        isStreaming,
      });

      // Slashes
      if (details) {
        details.warnings.forEach((w) => {
          if (w.slashed) {
            const milestone = details.milestones[w.id];
            slashList.push({
              id: `slash-${w.id}-${i}`,
              grantId: `GRT-${i}`,
              builder: g.builder as `0x${string}`,
              milestoneTitle: milestone?.title ?? 'Milestone Delivery',
              amountUsdc: w.amountReturnedUsdc ? Number(w.amountReturnedUsdc) : 10000,
              slashedAtMs: new Date(w.slashedAt || w.createdAt).getTime(),
              warningIssuedAtMs: new Date(w.warningTimestamp || w.createdAt).getTime(),
              txHash: (w.slashTxHash || w.txHash) as `0x${string}`,
              txUrl: `https://sepolia.arbiscan.io/tx/${w.slashTxHash || w.txHash}`,
            });
          }
        });
      }

      // Events
      activityList.push({
        id: `create-${i}`,
        kind: 'grant_created',
        description: 'Grant Created',
        amountUsdc: -totalUsdc,
        grantId: `GRT-${i}`,
        pathSegment: i.toString(),
        timestampMs: new Date(enriched?.createdAt || SESSION_START_MS).getTime(),
        txHash: '0x0' as `0x${string}`,
        txUrl: 'https://sepolia.arbiscan.io',
      });

      completedMilestones.forEach((m) => {
        activityList.push({
          id: `approve-${i}-${m.index}`,
          kind: 'milestone_approved',
          description: 'Milestone Released',
          amountUsdc: Number(BigInt(m.amount) / BigInt(1000000)),
          grantId: `GRT-${i}`,
          pathSegment: i.toString(),
          timestampMs: new Date(m.submission?.createdAt || SESSION_START_MS).getTime(),
          txHash: (m.submission?.submissionTxHash || '0x0') as `0x${string}`,
          txUrl: `https://sepolia.arbiscan.io/tx/${m.submission?.submissionTxHash || '0x0'}`,
        });
      });

      if (details) {
        details.warnings.forEach((w) => {
          if (w.slashed) {
            activityList.push({
              id: `slash-event-${w.id}-${i}`,
              kind: 'milestone_slashed',
              description: 'Funds Slashed',
              amountUsdc: w.amountReturnedUsdc ? Number(w.amountReturnedUsdc) : 10000,
              grantId: `GRT-${i}`,
              pathSegment: i.toString(),
              timestampMs: new Date(w.slashedAt || SESSION_START_MS).getTime(),
              txHash: (w.slashTxHash || w.txHash) as `0x${string}`,
              txUrl: `https://sepolia.arbiscan.io/tx/${w.slashTxHash || w.txHash}`,
            });
          }
        });
      }
    });

    const activeStreams = escrowList.filter((r) => r.isStreaming).map((r) => ({
      grantId: r.grantId,
      builder: r.builder,
      flowRateUsdcPerSec: r.streamRateUsdcPerSec,
      totalStreamedUsdcAtEpoch: r.streamAccumulatedUsdcAtEpoch,
      streamEpochMs: r.streamEpochMs,
      startedAtMs: r.streamEpochMs - 7 * 24 * 60 * 60 * 1000,
      nextDeadlineMs: r.nextDeadlineMs,
    }));

    // Projections
    const upcoming: { label: string; bucketMs: number; usdc: number }[] = [];
    const nowPoint = new Date();
    const startMonth = new Date(nowPoint.getFullYear(), nowPoint.getMonth(), 1);
    for (let i = 0; i < 6; i++) {
      const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const nextD = new Date(startMonth.getFullYear(), startMonth.getMonth() + i + 1, 1);
      let totalForMonth = 0;
      detailsList.forEach((details) => {
        if (!details) return;
        details.milestones.forEach((m) => {
          if (m.submission?.status !== 'approved') {
            const deadlineMs = Number(m.deadline) * 1000;
            if (deadlineMs >= d.getTime() && deadlineMs < nextD.getTime()) {
              totalForMonth += Number(BigInt(m.amount) / BigInt(1000000));
            }
          }
        });
      });
      upcoming.push({
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        bucketMs: d.getTime(),
        usdc: totalForMonth,
      });
    }

    const projections = {
      totalIfApprovedUsdc: upcoming.reduce((s, p) => s + p.usdc, 0),
      thisMonthUsdc: upcoming[0]?.usdc ?? 0,
      nextMonthUsdc: upcoming[1]?.usdc ?? 0,
      upcoming,
    };

    // Hero metrics
    const totalLocked = stats?.totalUsdcLocked ?? escrowList.reduce((s, r) => s + r.remainingUsdc, 0);
    const totalReleased = escrowList.reduce((s, r) => s + r.releasedUsdc, 0);
    const totalRecovered = stats?.liveSlashCounterUsdc ?? slashList.reduce((s, r) => s + r.amountUsdc, 0);
    const flowRate = activeStreams.reduce((s, r) => s + r.flowRateUsdcPerSec, 0);
    const avgSize = grantCount > 0 ? escrowList.reduce((s, r) => s + r.totalEscrowedUsdc, 0) / grantCount : 0;

    const hero = {
      totalUsdcLocked: totalLocked,
      totalReleasedAllTime: totalReleased,
      totalRecoveredViaSlashing: totalRecovered,
      currentlyStreamingFlowRate: flowRate,
      totalGrantsCreated: grantCount,
      averageGrantSizeUsdc: avgSize,
      sparks: EMPTY_TREASURY_SNAPSHOT.hero.sparks,
      delta: EMPTY_TREASURY_SNAPSHOT.hero.delta,
    };

    const cashFlow: Record<string, CashFlowPoint[]> = {
      '7D': [],
      '30D': [],
      '90D': [],
      '12M': [],
      ALL: [],
    };

    activityList.sort((a, b) => b.timestampMs - a.timestampMs);

    return {
      hero,
      cashFlow: cashFlow as any,
      escrow: escrowList,
      streams: activeStreams,
      slashes: slashList,
      projections,
      activity: activityList,
    };
  }, [grantsData, identitiesData, enrichedGrants, detailsList, stats, grantCount]);

  const isLoadingData =
    CONTRACTS_READY &&
    (isCountLoading || isAddressesLoading || isGrantsLoading || isIdentitiesLoading || isEnrichedLoading);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Refresh on-chain trigger: any GrantEscrow event invalidates the snapshot.
  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    onLogs: () => refresh(),
  });

  useEffect(() => {
    if (CONTRACTS_READY && mappedSnapshot && !isLoadingData) {
      const current = useTreasuryStore.getState().snapshot;
      const hashCurrent = JSON.stringify({
        hero: current.hero,
        escrow: current.escrow,
        streams: current.streams,
        slashes: current.slashes,
        projections: current.projections,
        activity: current.activity,
      });
      const hashMapped = JSON.stringify({
        hero: mappedSnapshot.hero,
        escrow: mappedSnapshot.escrow,
        streams: mappedSnapshot.streams,
        slashes: mappedSnapshot.slashes,
        projections: mappedSnapshot.projections,
        activity: mappedSnapshot.activity,
      });

      if (hashCurrent !== hashMapped) {
        setSnapshot(mappedSnapshot);
      }
    }
  }, [mappedSnapshot, isLoadingData, setSnapshot]);

  const authorized = minTimeElapsed && guard.state === 'allowed';
  const showDeniedToast = minTimeElapsed && guard.state === 'blocked';
  const showSkeleton = (!authorized && !showDeniedToast) || isLoadingData;

  return (
    <DaoAppShell breadcrumb={[{ label: 'Treasury' }]}>
      {showDeniedToast ? <DaoAccessDeniedToast /> : null}
      {showSkeleton ? (
        <TreasurySkeleton />
      ) : authorized ? (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header — title left, time range pill selector right. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
                  Treasury Command Center
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Full financial picture across every grant — locked escrow, live
                  streams, recovered funds, and projected outflows. Refreshes every
                  30 seconds.
                </p>
              </div>
              <div className="shrink-0">
                <TimeRangeSelector />
              </div>
            </div>

            <FinancialOverviewBar hero={snapshot.hero} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CashFlowChart data={snapshot.cashFlow[range]} />
              </div>
              <div>
                <ProjectedCommitments data={snapshot.projections} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <EscrowBreakdownTable rows={snapshot.escrow} />
              </div>
              <div>
                <StreamingOverviewPanel streams={snapshot.streams} />
              </div>
            </div>

            <div
              id="treasury-activity"
              className="grid grid-cols-1 gap-4 scroll-mt-20 lg:grid-cols-2"
            >
              <SlashRecoveryHistory rows={snapshot.slashes} />
              <TreasuryActivityFeed events={snapshot.activity} />
            </div>
          </div>
        </main>
      ) : null}
    </DaoAppShell>
  );
}
