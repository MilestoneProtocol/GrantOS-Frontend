'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import BuilderDashboardToast from '@/components/builder/BuilderDashboardToast';
import WarningBannerStack from '@/components/builder/dashboard/WarningBannerStack';
import { useAuthGuard } from '@/lib/authGuard';
import {
  CONTRACTS_READY,
  GRANT_FACTORY_ADDRESS,
  grantFactoryAbi,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { safeFactoryGrantCount } from '@/lib/grant-factory-read';
import { USDC_DECIMALS } from '@/lib/usdc';
import {
  buildUiDemoGrantSummary,
  isUiDemoMode,
  UI_DEMO_GRANT_PATH_ID,
} from '@/demo';
import { demoPathSegmentForChainIndex } from '@/lib/public-explorer-grant';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { formatUnits, zeroAddress, type Address } from 'viem';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useBuilderSubmissions } from '@/lib/hooks/useBuilderSubmissions';

type GrantSummary = {
  id: bigint;
  builder: Address;
  streaming: boolean;
  committee: Address[];
  quorum: bigint;
  createdAt: bigint;
  milestones: Array<{
    title: string;
    description: string;
    amount: bigint;
    deadline: bigint;
    proofType: number;
  }>;
};

type GrantFromChain = Omit<GrantSummary, 'id'>;

function formatUsdc(amount: bigint) {
  return Number(formatUnits(amount, USDC_DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function BuilderDashboardPage() {
  const guard = useAuthGuard('builder');
  const { address } = useAccount();
  const [expandedGrantKeys, setExpandedGrantKeys] = useState<Record<string, boolean>>({});
  const { submissions: backendSubmissions } = useBuilderSubmissions();

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean((identityData as any)?.isVerified);

  const { data: countData, isLoading: isCountLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
    query: { enabled: CONTRACTS_READY && Boolean(address) },
  });

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
    return escrowAddresses.map((addr) => ({
      address: addr as `0x${string}`,
      abi: grantEscrowReadAbi,
      functionName: 'getGrant',
    }));
  }, [escrowAddresses]);

  const { data: grantsData, isLoading: isGrantsLoading } = useReadContracts({
    contracts: grantContracts,
    query: { enabled: grantContracts.length > 0 },
  });

  const grants = useMemo(() => {
    if (!grantsData) return [] as GrantSummary[];
    return grantsData
      .map((entry, index) => {
        const row = entry as { status: string; result?: GrantFromChain };
        if (row.status !== 'success' || row.result === undefined) return null;
        const grant = row.result;
        if (address && grant.builder.toLowerCase() !== address.toLowerCase()) return null;
        return { ...grant, id: BigInt(index) };
      })
      .filter(Boolean) as GrantSummary[];
  }, [address, grantsData]);

  const dashboardGrantRows = useMemo(() => {
    const chainRows = grants.map((g) => ({
      grant: g,
      pathSegment: isUiDemoMode()
        ? demoPathSegmentForChainIndex(g.id, g.builder)
        : g.id.toString(),
      isUiDemo: false,
    }));
    if (!isUiDemoMode()) return chainRows;
    const demoBuilder = (address ?? zeroAddress) as Address;
    const demo = buildUiDemoGrantSummary(demoBuilder) as GrantSummary;
    return [
      { grant: demo, pathSegment: UI_DEMO_GRANT_PATH_ID, isUiDemo: true },
      ...chainRows,
    ];
  }, [address, grants]);

  const totals = useMemo(() => {
    let escrow = BigInt(0);
    let pending = 0;
    for (const { grant } of dashboardGrantRows) {
      for (const milestone of grant.milestones) {
        escrow += milestone.amount;
        pending += 1;
      }
    }
    return {
      activeGrants: dashboardGrantRows.length,
      escrow,
      pendingMilestones: pending,
    };
  }, [dashboardGrantRows]);

  const loadingGrants =
    isCountLoading || isAddressesLoading || isGrantsLoading;

  function toggleGrant(id: bigint) {
    const key = id.toString();
    setExpandedGrantKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (guard.state === 'loading') {
    return (
      <BuilderAppShell>
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          Detecting your role…
        </main>
      </BuilderAppShell>
    );
  }

  if (guard.state === 'blocked') {
    return (
      <BuilderAppShell>
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          Redirecting…
        </main>
      </BuilderAppShell>
    );
  }

  return (
    <BuilderAppShell>
      <Suspense fallback={null}>
        <BuilderDashboardToast />
      </Suspense>
      <main className="w-full px-5 py-5 md:px-8 lg:px-10">
        <div className="w-full space-y-5">
          <WarningBannerStack />

          <header className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h1 className="text-2xl font-bold tracking-tight">Active Grants</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your active milestones and submit proofs for completed work.
            </p>
          </header>

          {!zkVerified && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-900">
                  Identity verification required. Committee members cannot trust your ZK Verified badge until you completely verify.
                </p>
              </div>
              <Link href="/verify" className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600">
                Verify Now <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Total Active Grants</p>
              <p className="mt-1 text-3xl font-bold">{totals.activeGrants}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">USDC in Escrow</p>
              <p className="mt-1 text-3xl font-bold">${formatUsdc(totals.escrow)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Pending Action</p>
              <p className="mt-1 text-3xl font-bold text-indigo-600">{totals.pendingMilestones}</p>
            </div>
          </section>

          {loadingGrants && (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading builder grants...
            </div>
          )}

          {(!loadingGrants && dashboardGrantRows.length === 0) && (
             <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-50 blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-blue-50 blur-3xl" />
                </div>
                <div className="relative mx-auto max-w-lg">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your journey starts here.</h2>
                  <p className="mt-4 text-base text-slate-500">You haven't received any grants yet. Your builder profile acts as your live resume on GrantOS.</p>
                </div>
             </section>
          )}

          {(!loadingGrants && dashboardGrantRows.length > 0) && (
            <section className="space-y-4">
              {dashboardGrantRows.map(({ grant, pathSegment, isUiDemo }) => {
                const grantKey = grant.id.toString();
                const expanded = Boolean(expandedGrantKeys[grantKey]);
                const totalGrantAmount = grant.milestones.reduce((sum, m) => sum + m.amount, BigInt(0));
                const completed = grant.milestones.length > 0 ? 1 : 0; // Simplified for now
                const progressPct = grant.milestones.length > 0 ? Math.round((completed / grant.milestones.length) * 100) : 0;

                return (
                  <article key={isUiDemo ? `ui-demo-${grantKey}` : grantKey} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isUiDemo ? 'border-amber-200' : 'border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-slate-900">Grant #{grantKey}</p>
                        <p className="mt-1 text-xs text-slate-500">{grant.committee.length} Committee Members · $ {formatUsdc(totalGrantAmount)} total</p>
                      </div>
                      <button type="button" onClick={() => toggleGrant(grant.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {expanded ? 'Hide Milestones' : 'Expand Milestones'}
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>

                    {expanded && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Idx</th>
                              <th className="px-4 py-3">Title</th>
                              <th className="px-4 py-3">Deadline</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grant.milestones.map((m, idx) => {
                              const submission = backendSubmissions[`${grant.id}-${idx}`];
                              const status = submission ? submission.status : 'Pending';
                              const overdue = Number(m.deadline) > 0 && Date.now() > Number(m.deadline) * 1000;
                              const submitHref = `/grants/${pathSegment}/milestones/${idx}/submit`;

                              return (
                                <tr key={`${grantKey}-${idx}`} className="border-t border-slate-100 text-sm">
                                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium text-slate-900">{m.title}</td>
                                  <td className={`px-4 py-3 ${overdue ? 'text-red-600' : ''}`}>{Number(m.deadline) > 0 ? new Date(Number(m.deadline) * 1000).toLocaleDateString() : '—'}</td>
                                  <td className="px-4 py-3">${formatUsdc(m.amount)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : status === 'Submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {status === 'Submitted' ? 'Awaiting Quorum' : status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {status === 'Pending' ? (
                                      m.proofType === 0 ? (
                                        <Link href={submitHref} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">
                                          Generate Proof
                                        </Link>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                          Submit URL
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </BuilderAppShell>
  );
}
