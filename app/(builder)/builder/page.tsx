'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import BuilderDashboardToast from '@/components/builder/BuilderDashboardToast';
import WarningBannerStack from '@/components/builder/dashboard/WarningBannerStack';
import { useAuthGuard } from '@/lib/authGuard';
import { GRANT_ESCROW_ADDRESS, grantEscrowReadAbi, IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import { USDC_DECIMALS } from '@/lib/usdc';
import {
  buildUiDemoGrantSummary,
  isUiDemoMode,
  UI_DEMO_GRANT_PATH_ID,
} from '@/demo';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { formatUnits, zeroAddress, type Address } from 'viem';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';

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

/** `getGrant` return shape (no `id` until we attach it from the ID list). */
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
    return null;
  }

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const zkVerified = Boolean(identityData?.[0]);

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
    const pick = (value: unknown): bigint[] => (Array.isArray(value) ? (value as bigint[]) : []);
    const a = pick(builderIdsReadA.data);
    if (a.length > 0) return a;
    const b = pick(builderIdsReadB.data);
    if (b.length > 0) return b;
    const c = pick(builderIdsReadC.data);
    if (c.length > 0) return c;
    return [];
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

  const grants = useMemo(() => {
    if (!grantsRead.data) return [] as GrantSummary[];
    return grantsRead.data
      .map((entry, index) => {
        const row = entry as { status: string; result?: GrantFromChain };
        if (row.status !== 'success' || row.result === undefined) return null;
        const grant = row.result;
        if (address && grant.builder.toLowerCase() !== address.toLowerCase()) return null;
        return { ...grant, id: builderGrantIds[index] ?? BigInt(0) };
      })
      .filter(Boolean) as GrantSummary[];
  }, [address, builderGrantIds, grantsRead.data]);

  type DashboardGrantRow = { grant: GrantSummary; pathSegment: string; isUiDemo: boolean };

  const dashboardGrantRows = useMemo((): DashboardGrantRow[] => {
    const chainRows: DashboardGrantRow[] = grants.map((g) => ({
      grant: g,
      pathSegment: g.id.toString(),
      isUiDemo: false,
    }));
    if (!isUiDemoMode()) return chainRows;
    // Show mock grant even without a wallet so the dashboard isn’t empty; submit flow still needs connect.
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
    builderIdsReadA.isLoading || builderIdsReadB.isLoading || builderIdsReadC.isLoading || grantsRead.isLoading;

  function toggleGrant(id: bigint) {
    const key = id.toString();
    setExpandedGrantKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const noGrants = !loadingGrants && dashboardGrantRows.length === 0;
  const identityLink =
    typeof window !== 'undefined' && address ? `${window.location.origin}/verify?builder=${address}` : '';

  return (
    <BuilderAppShell>
      <Suspense fallback={null}>
        <BuilderDashboardToast />
      </Suspense>
      <main className="w-full px-5 py-5 md:px-8 lg:px-10">
        <div className="w-full space-y-5">
          {/*
           * Active warning banners ride at the very top of the main content
           * area — per PRD they must sit above the page header / summary
           * cards / grant list so the builder cannot scroll past them.
           */}
          <WarningBannerStack />

          <header className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h1 className="text-2xl font-bold tracking-tight">Active Grants</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your active milestones and submit proofs for completed work.
            </p>
          </header>

          {!zkVerified ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-900">
                  Identity verification required. Committee members cannot trust your ZK Verified badge until you
                  completely verify.
                </p>
              </div>
              <Link
                href="/verify"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Verify Now <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}

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

          {loadingGrants ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-12 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading builder grants...
            </div>
          ) : null}

          {isUiDemoMode() ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p>
                <span className="font-semibold">UI demo mode is on</span> ({' '}
                <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GRANTOS_UI_DEMO=true</code> ). The first
                grant card is mock data for layout review. Milestone submission uses{' '}
                <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">/grants/ui-demo/milestones/…</code> and does not read
                the escrow contract. Remove or set the flag to{' '}
                <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">false</code> for production.
              </p>
              {!address ? (
                <p className="mt-2 text-amber-900">Connect a wallet so the demo grant matches your address and submission preview works.</p>
              ) : null}
            </div>
          ) : null}

          {noGrants ? (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto max-w-md">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">No active grants yet.</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Share this with a DAO to receive your first grant. Your builder profile acts as your resume on GrantOS.
                </p>
                {!isUiDemoMode() ? (
                  <p className="mt-4 text-xs text-slate-500">
                    Developer preview: add{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5">NEXT_PUBLIC_GRANTOS_UI_DEMO=true</code> to{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.local</code> and restart the dev server to load a mock grant and milestone submission UI without on-chain data.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(identityLink).catch(() => {})}
                  disabled={!identityLink}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" /> Copy Verified Identity Link
                </button>
                {identityLink ? <p className="mt-2 break-all text-xs text-slate-400">{identityLink}</p> : null}
              </div>
            </section>
          ) : null}

          {!loadingGrants && dashboardGrantRows.length > 0 ? (
            <section className="space-y-4">
              {dashboardGrantRows.map(({ grant, pathSegment, isUiDemo }) => {
                const grantKey = grant.id.toString();
                const expanded = Boolean(expandedGrantKeys[grantKey]);
                const totalGrantAmount = grant.milestones.reduce((sum, m) => sum + m.amount, BigInt(0));
                const completed = Math.min(1, grant.milestones.length);
                const progressPct =
                  grant.milestones.length > 0 ? Math.round((completed / grant.milestones.length) * 100) : 0;

                return (
                  <article
                    key={isUiDemo ? `ui-demo-${grantKey}` : grantKey}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isUiDemo ? 'border-amber-200' : 'border-slate-200'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-slate-900">
                          Grant #{grantKey}
                          {isUiDemo ? (
                            <span className="ml-2 text-xs font-normal text-amber-800">(demo)</span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {grant.committee.length} Committee Members · {grant.streaming ? 'Streaming' : 'Lump-Sum'} · $
                          {formatUsdc(totalGrantAmount)} total
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-36">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Progress</span>
                            <span>
                              {completed}/{grant.milestones.length} milestones
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGrant(grant.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {expanded ? 'Hide Milestones' : 'Expand Milestones'}
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Idx</th>
                              <th className="px-4 py-3">Milestone Title</th>
                              <th className="px-4 py-3">Deadline</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Proof Type</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grant.milestones.map((m, idx) => {
                              const overdue = Number(m.deadline) > 0 && Date.now() > Number(m.deadline) * 1000;
                              const status: 'pending' | 'approved' = isUiDemo
                                ? 'pending'
                                : idx === 0
                                  ? 'approved'
                                  : 'pending';
                              const zkRequired = m.proofType === 0;
                              const submitHref = `/grants/${pathSegment}/milestones/${idx}/submit`;

                              return (
                                <tr key={`${grantKey}-${idx}`} className="border-t border-slate-100 text-sm">
                                  <td className="px-4 py-3 text-slate-500">{String(idx + 1).padStart(2, '0')}</td>
                                  <td className="px-4 py-3 font-medium text-slate-900">
                                    {m.title || `Milestone ${idx + 1}`}
                                  </td>
                                  <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                                    {Number(m.deadline) > 0
                                      ? new Date(Number(m.deadline) * 1000).toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-800">${formatUsdc(m.amount)}</td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${zkRequired ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}
                                    >
                                      {zkRequired ? 'ZK Required' : 'EAS Only'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {status === 'approved' ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                        <Check className="h-3.5 w-3.5" /> Approved
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {status === 'approved' ? (
                                      <span className="inline-flex items-center text-emerald-600">
                                        <Check className="h-4 w-4" />
                                      </span>
                                    ) : zkRequired ? (
                                      <Link
                                        href={submitHref}
                                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                                      >
                                        Generate Proof
                                      </Link>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                      >
                                        Submit Evidence
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : null}

          {builderIdsReadA.isError && builderIdsReadB.isError && builderIdsReadC.isError ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ExternalLink className="h-3.5 w-3.5" />
              Could not find a builder-grants indexer method on GrantEscrow. Configure `getGrantsByBuilder`-style read
              method in your contract to populate dashboard data.
            </p>
          ) : null}
        </div>
      </main>
    </BuilderAppShell>
  );
}
