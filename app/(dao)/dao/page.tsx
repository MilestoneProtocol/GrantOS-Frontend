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
import { GRANT_ESCROW_ADDRESS } from '@/lib/escrow';
import { useAlertsStore } from '@/store/alertsStore';
import { Download, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';

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

  const filtered = useMemo(
    () => filterDaoGrants(snapshot.grants, selected, search),
    [snapshot.grants, selected, search],
  );

  const showSkeleton = !authorized && !showDeniedToast;

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

              <DaoTreasuryOverview hero={snapshot.hero} />

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
