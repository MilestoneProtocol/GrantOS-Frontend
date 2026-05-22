'use client';

import AlertsPanel from '@/components/dao/AlertsPanel';
import DaoAccessDeniedToast from '@/components/dao/DaoAccessDeniedToast';
import DaoAppShell from '@/components/dao/DaoAppShell';
import DaoDashboardSkeleton from '@/components/dao/DaoDashboardSkeleton';
import DaoFilterBar, { useDaoFilters } from '@/components/dao/DaoFilterBar';
import DaoGrantCard from '@/components/dao/DaoGrantCard';
import DaoGrantDrawer from '@/components/dao/DaoGrantDrawer';
import DaoTreasuryOverview from '@/components/dao/DaoTreasuryOverview';
import { grantEscrowEventsAbi } from '@/lib/notifications';
import { useAuthGuard } from '@/lib/authGuard';
import { filterDaoGrants } from '@/lib/dao-dashboard-data';
import { useDaoDashboardStore } from '@/lib/dao-dashboard-store';
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
import { useBuilderReputations } from '@/hooks/useBuilderReputations';
import { useAlertsStore } from '@/store/alertsStore';
import { useDashboardStats } from '@/hooks/useGrantStats';
import { Download, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useWatchContractEvent, useReadContract, useReadContracts } from 'wagmi';
import type { DaoGrantCardModel } from '@/demo/dao-dashboard';
import { zeroAddress } from 'viem';

const MIN_VALIDATION_MS = 1500;

/**
 * DAO oversight dashboard — treasury macro view, escalation alerts, grant grid.
 */
export default function DaoDashboardPage() {
  const router = useRouter();
  const guard = useAuthGuard('dao');
  const { search, setSearch, selected, onToggle } = useDaoFilters();
  const snapshot = useDaoDashboardStore((s) => s.snapshot);
  const openGrant = useDaoDashboardStore((s) => s.openGrant);
  const setOpenGrant = useDaoDashboardStore((s) => s.setOpenGrant);
  const refreshDashboard = useDaoDashboardStore((s) => s.refresh);
  const alerts = useAlertsStore((s) => s.alerts);
  const alertsCollapsed = useAlertsStore((s) => s.collapsed);
  const toggleAlertsCollapsed = useAlertsStore((s) => s.toggleCollapsed);
  const refreshAlerts = useAlertsStore((s) => s.refreshFromSnapshot);

  // Fetch real stats from backend
  const { data: stats } = useDashboardStats(30000);

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

  // Fetch reputation scores for all builders
  const { reputations } = useBuilderReputations(
    builderAddresses.filter((addr) => addr !== zeroAddress),
  );

  const mappedGrants = useMemo((): DaoGrantCardModel[] => {
    if (!CONTRACTS_READY || !grantsData) return [];
    return grantsData
      .map((row: any, i: number) => {
        if (row.status !== 'success' || !row.result) return null;
        const g = row.result;
        const identity = (identitiesData?.[i] as any)?.result as
          | { isVerified: boolean; tier: bigint; githubHandle: string }
          | undefined;

        const totalUsdc = Number(
          g.milestones.reduce((s: bigint, m: any) => s + m.amount, BigInt(0)) / BigInt(1000000),
        );

        // Find enriched data from backend
        const enriched = enrichedGrants?.find(eg => eg.onChainId === i);

        const nextDeadline =
          g.milestones[0]?.deadline > BigInt(0)
            ? new Date(Number(g.milestones[0].deadline) * 1000).toISOString()
            : null;

        const rep = reputations.get(g.builder.toLowerCase());

        return {
          slug: i.toString(),
          displayId: `#GRT-${i}`,
          builder: g.builder as `0x${string}`,
          contributionTier: identity ? `Tier ${identity.tier} Contributor` : 'Contributor',
          reputationScore: rep ? rep.score : (identity ? Number(identity.tier) * 25 + 15 : 0),
          createdAtIso: enriched?.createdAt || new Date().toISOString(),
          milestoneTotal: g.milestones.length,
          milestoneCompleted: enriched?.completedMilestones || 0,
          paymentMode: g.streaming ? 'streaming' : 'lump_sum',
          zkVerified: identity?.isVerified ?? false,
          isStreamingActive: g.streaming && !(g.milestones.length > 0 && (enriched?.completedMilestones || 0) === g.milestones.length),
          streamRateUsdcPerSec: 0,
          streamAccumulatedUsdcAtEpoch: 0,
          streamEpochMs: Date.now(),
          nextDeadlineIso: nextDeadline,
          totalGrantUsdc: totalUsdc,
          hasWarning: enriched?.hasWarning || false,
          hasSlashed: enriched?.hasSlashed || false,
          tags: (() => {
            const isCompleted = g.milestones.length > 0 && (enriched?.completedMilestones || 0) === g.milestones.length;
            const t = [];
            if (isCompleted) {
              t.push('completed');
            } else if (g.streaming) {
              t.push('streaming');
            } else {
              t.push('active');
            }
            return t;
          })(),
          milestones: [],
        };
      })
      .filter((x) => x !== null) as DaoGrantCardModel[];
  }, [grantsData, identitiesData, enrichedGrants, reputations]);

  const setSnapshot = useDaoDashboardStore((s) => s.setSnapshot);

  const heroStats = stats || snapshot.hero;

  useEffect(() => {
    if (CONTRACTS_READY && mappedGrants !== undefined) {
      const current = useDaoDashboardStore.getState().snapshot;
      const grantsChanged = JSON.stringify(current.grants) !== JSON.stringify(mappedGrants);
      const heroChanged = JSON.stringify(current.hero) !== JSON.stringify(heroStats);

      if (grantsChanged || heroChanged) {
        setSnapshot({
          hero: heroStats,
          grants: mappedGrants,
        });
      }
    }
  }, [mappedGrants, heroStats, setSnapshot]);

  const isLoadingData =
    CONTRACTS_READY &&
    (isCountLoading || isAddressesLoading || isGrantsLoading || isIdentitiesLoading || isEnrichedLoading);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    refreshAlerts(snapshot);
  }, [refreshAlerts, snapshot]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshDashboard();
      queueMicrotask(() =>
        refreshAlerts(useDaoDashboardStore.getState().snapshot),
      );
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refreshAlerts, refreshDashboard]);

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    onLogs: () => {
      refreshDashboard();
      refreshAlerts(useDaoDashboardStore.getState().snapshot);
    },
  });

  const authorized = minTimeElapsed && guard.state === 'allowed';
  const showDeniedToast = minTimeElapsed && guard.state === 'blocked';

  const showSkeleton = (!authorized && !showDeniedToast) || isLoadingData;

  const filtered = useMemo(
    () => filterDaoGrants(snapshot.grants, selected, search),
    [snapshot.grants, selected, search],
  );

  return (
    <DaoAppShell
      breadcrumb={[{ label: 'DAO', href: '/dao' }, { label: 'Dashboard' }]}
    >
      {showDeniedToast ? <DaoAccessDeniedToast /> : null}
      {showSkeleton ? (
        <DaoDashboardSkeleton />
      ) : authorized ? (
        <>
          <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    DAO Dashboard
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Protocol-wide oversight — treasury health, escalation alerts, and grant
                    activity. Metrics refresh every 30 seconds.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/grants/new?from=dao')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    New Grant
                  </button>
                </div>
              </div>

              <DaoTreasuryOverview hero={heroStats} />

              <AlertsPanel
                alerts={alerts}
                collapsed={alertsCollapsed}
                onToggleCollapsed={toggleAlertsCollapsed}
              />

              <section aria-label="Grant program" className="space-y-4">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Grants</h2>
                <DaoFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  selected={selected}
                  onToggle={onToggle}
                  visibleCount={filtered.length}
                  totalCount={snapshot.grants.length}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((g) => (
                    <DaoGrantCard key={g.slug} grant={g} onOpen={setOpenGrant} />
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                    No grants match your filters or search.
                  </p>
                ) : null}
              </section>
            </div>
          </main>

          <DaoGrantDrawer grant={openGrant} onClose={() => setOpenGrant(null)} />
        </>
      ) : null}
    </DaoAppShell>
  );
}
