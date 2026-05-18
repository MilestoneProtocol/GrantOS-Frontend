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
import { GRANT_ESCROW_ADDRESS } from '@/lib/escrow';
import { grantEscrowEventsAbi } from '@/lib/notifications';
import { useTreasuryStore } from '@/store/treasuryStore';
import { useEffect, useState } from 'react';
import { useWatchContractEvent } from 'wagmi';

const MIN_VALIDATION_MS = 1500;
const POLL_MS = 30_000;

/**
 * `/treasury` — DAO Admin only. The full Treasury Command Center.
 *
 * Shape:
 *  1. Financial Overview Bar (six metric cards w/ sparklines)
 *  2. Cash Flow chart  +  Projected Commitments (two-up)
 *  3. Escrow Breakdown table  +  Live Streams panel
 *  4. Slash Recovery History  +  Treasury Activity Feed
 *
 * Auth: gated by the existing DAO admin guard. While the wallet/role
 * resolves we render `TreasurySkeleton`. On hard denial we redirect to /
 * via the auth guard and briefly show an inline toast.
 */
export default function TreasuryPage() {
  const guard = useAuthGuard('dao');
  const snapshot = useTreasuryStore((s) => s.snapshot);
  const refresh = useTreasuryStore((s) => s.refresh);
  const range = useTreasuryStore((s) => s.range);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  // 30-second polling refresh — the same cadence as the DAO dashboard.
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

  const authorized = minTimeElapsed && guard.state === 'allowed';
  const showDeniedToast = minTimeElapsed && guard.state === 'blocked';
  const showSkeleton = !authorized && !showDeniedToast;

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
