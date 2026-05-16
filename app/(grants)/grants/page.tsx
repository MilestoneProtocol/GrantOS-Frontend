'use client';

import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import {
  gradeTone,
  hoursUntil,
  letterGradeFromScore,
  type DaoGrantCardModel,
} from '@/demo/dao-dashboard';
import {
  GRANT_ESCROW_ADDRESS,
  GRANT_FACTORY_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
  grantEscrowReadAbi,
  grantFactoryAbi,
  identityRegistryAbi,
} from '@/lib/escrow';
import { formatUnits, zeroAddress } from 'viem';
import { useReadContract, useReadContracts } from 'wagmi';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  CircleDollarSign,
  Clock,
  Coins,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ExplorerFilter = 'all' | 'streaming' | 'active' | 'completed' | 'warning' | 'slashed';

const FILTERS: { id: ExplorerFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All grants', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'active', label: 'Active', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'streaming', label: 'Streaming', icon: <Waves className="h-3.5 w-3.5" /> },
  { id: 'completed', label: 'Completed', icon: <BadgeCheck className="h-3.5 w-3.5" /> },
  { id: 'warning', label: 'Warning issued', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: 'slashed', label: 'Slashed', icon: <ShieldX className="h-3.5 w-3.5" /> },
];

/**
 * Public Grant Explorer — `/grants`. Browsable without a wallet connection.
 * Cards link to `/grants/[slug]` for detail wiring downstream.
 */
export default function GrantsExplorerPage() {
  const { data: countData, isLoading: isCountLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grantCount',
  });

  const grantCount = Number(countData || 0n);

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

  const grants = useMemo((): DaoGrantCardModel[] => {
    if (!grantsData) return [];
    return grantsData
      .map((row: any, i: number) => {
        if (row.status !== 'success' || !row.result) return null;
        const g = row.result;
        const identity = (identitiesData?.[i] as any)?.result as
          | { isVerified: boolean; tier: bigint; githubHandle: string }
          | undefined;

        const totalUsdc = Number(
          g.milestones.reduce((s: bigint, m: any) => s + m.amount, 0n) / 1000000n,
        );

        return {
          slug: i.toString(),
          displayId: `#GRT-${i}`,
          builder: g.builder,
          contributionTier: identity ? `Tier ${identity.tier} Contributor` : 'Contributor',
          reputationScore: identity ? Number(identity.tier) * 25 + 15 : 0,
          milestoneTotal: g.milestones.length,
          milestoneCompleted: 0,
          paymentMode: g.streaming ? 'streaming' : 'lump-sum',
          zkVerified: identity?.isVerified ?? false,
          isStreamingActive: g.streaming,
          streamAccumulatedUsdcAtEpoch: 0,
          nextDeadlineIso:
            g.milestones[0]?.deadline > 0n
              ? new Date(Number(g.milestones[0].deadline) * 1000).toISOString()
              : undefined,
          totalGrantUsdc: totalUsdc,
          hasWarning: false,
          hasSlashed: false,
          tags: g.streaming ? ['active', 'streaming'] : ['active'],
        };
      })
      .filter((x): x is DaoGrantCardModel => x !== null);
  }, [grantsData, identitiesData]);

  const isLoading = isCountLoading || isAddressesLoading || isGrantsLoading || isIdentitiesLoading;

  const [filter, setFilter] = useState<ExplorerFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grants.filter((g) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'streaming'
            ? g.isStreamingActive
            : filter === 'active'
              ? g.tags.includes('active')
              : filter === 'completed'
                ? g.tags.includes('completed')
                : filter === 'warning'
                  ? g.hasWarning && !g.hasSlashed
                  : filter === 'slashed'
                    ? g.hasSlashed
                    : true;
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        g.displayId.toLowerCase().includes(q) ||
        g.builder.toLowerCase().includes(q) ||
        g.contributionTier.toLowerCase().includes(q)
      );
    });
  }, [filter, grants, query]);

  const totals = useMemo(() => {
    const locked = grants.reduce((sum, g) => sum + g.totalGrantUsdc, 0);
    const streaming = grants.filter((g) => g.isStreamingActive).length;
    const warnings = grants.filter((g) => g.hasWarning && !g.hasSlashed).length;
    return { locked, streaming, warnings };
  }, [grants]);

  return (
    <OnboardingShell>
      <div className="relative isolate w-full overflow-hidden">
        {/* Background */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/3 h-[440px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#dbeafe,transparent_70%)]" />
          <div className="absolute right-[-160px] top-[160px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,#ede9fe,transparent_70%)]" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ex-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ex-grid)" />
          </svg>
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 animate-grantos-pulse" />
                Public Explorer
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">Read-only</span>
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-[1.05]">
                Every onchain grant,
                <br />
                <span className="font-serif italic">verifiable from this screen.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Browse active grants, milestone progress, and committee actions. Click any
                card to drop into the full detail page.
              </p>
            </div>

            {/* Aggregate */}
            <div className="grid w-full grid-cols-3 gap-3 lg:max-w-md">
              <ExplorerStat
                label="Locked in escrow"
                value={`$${(totals.locked / 1000).toFixed(1)}K`}
                tone="emerald"
                icon={<CircleDollarSign className="h-3.5 w-3.5" />}
              />
              <ExplorerStat
                label="Active streams"
                value={String(totals.streaming)}
                tone="sky"
                icon={<Waves className="h-3.5 w-3.5" />}
              />
              <ExplorerStat
                label="Open warnings"
                value={String(totals.warnings)}
                tone="amber"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by id, builder, tier…"
                className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Results meta */}
          <div className="mt-6 flex items-center justify-between gap-2 text-xs text-slate-500">
            <div className="inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Showing <span className="font-semibold text-slate-900">{filtered.length}</span>{' '}
              of <span className="font-semibold text-slate-900">{grants.length}</span> grants
            </div>
            <p className="hidden sm:block">
              Updated continuously from <span className="font-semibold text-slate-700">GrantEscrow.sol</span>
            </p>
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="mt-10 flex flex-col items-center justify-center space-y-4 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="text-sm font-medium text-slate-500 italic">Syncing live grant registry...</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onClear={() => { setFilter('all'); setQuery(''); }} />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((g) => (
                <GrantExplorerCard key={g.slug} grant={g} />
              ))}
            </div>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}

/* ------------------------------- pieces ------------------------------- */

function ExplorerStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'amber';
  icon: React.ReactNode;
}) {
  const chip =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'sky'
        ? 'bg-sky-50 text-sky-700 ring-sky-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${chip}`}>
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function GrantExplorerCard({ grant }: { grant: DaoGrantCardModel }) {
  const progress =
    grant.milestoneTotal > 0
      ? Math.min(100, Math.round((grant.milestoneCompleted / grant.milestoneTotal) * 100))
      : 0;
  const grade = letterGradeFromScore(grant.reputationScore);
  const gradeChip = gradeChipClass(gradeTone(grant.reputationScore));
  const status = computeStatus(grant);

  return (
    <Link
      href={`/grants/${encodeURIComponent(grant.slug)}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_50px_-22px_rgba(15,23,42,0.18)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-linear-to-br from-slate-100 via-white to-white opacity-0 transition group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {grant.displayId}
          </p>
          <p className="mt-1 truncate text-base font-bold tracking-tight text-slate-900">
            {shortBuilder(grant.builder)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{grant.contributionTier}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Grant size
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            ${grant.totalGrantUsdc.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500">USDC</span>
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${gradeChip}`}
        >
          <BadgeCheck className="h-3 w-3" />
          {grade} · Rep {grant.reputationScore}
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>
            <span className="font-bold text-slate-900">{grant.milestoneCompleted}</span>{' '}
            / {grant.milestoneTotal} milestones
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2">
        <MetaRow
          icon={<Coins className="h-3.5 w-3.5" />}
          label={grant.paymentMode === 'streaming' ? 'Streaming' : 'Lump-sum'}
          tone={grant.paymentMode === 'streaming' ? 'sky' : 'slate'}
        />
        <MetaRow
          icon={grant.zkVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldX className="h-3.5 w-3.5" />}
          label={grant.zkVerified ? 'ZK identity' : 'Unverified'}
          tone={grant.zkVerified ? 'emerald' : 'amber'}
        />
        {grant.isStreamingActive ? (
          <MetaRow
            icon={<Waves className="h-3.5 w-3.5" />}
            label={`$${grant.streamAccumulatedUsdcAtEpoch.toFixed(0)}+ streamed`}
            tone="sky"
          />
        ) : null}
        {grant.nextDeadlineIso ? (
          <DeadlineRow iso={grant.nextDeadlineIso} />
        ) : (
          <MetaRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="No upcoming"
            tone="slate"
          />
        )}
      </div>

      <div className="relative mt-5 flex items-center justify-between text-xs">
        <span className="font-mono text-slate-500">
          builder · {shortBuilder(grant.builder)}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 transition group-hover:text-slate-900">
          View grant
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function MetaRow({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'sky' | 'emerald' | 'amber' | 'slate' | 'rose';
}) {
  const toneCls =
    tone === 'sky'
      ? 'bg-sky-50 text-sky-700 ring-sky-200'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : tone === 'rose'
            ? 'bg-rose-50 text-rose-700 ring-rose-200'
            : 'bg-slate-50 text-slate-700 ring-slate-200';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset ${toneCls}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function DeadlineRow({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hours = hoursUntil(iso);
  const past = hours < 0;
  const soon = !past && hours < 48;
  const tone: 'rose' | 'amber' | 'slate' = past ? 'rose' : soon ? 'amber' : 'slate';
  const label = past
    ? `Overdue ${Math.abs(Math.round(hours))}h`
    : hours < 24
      ? `${Math.round(hours)}h left`
      : `${Math.round(hours / 24)}d left`;

  void now;
  return <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label={label} tone={tone} />;
}

function StatusPill({
  status,
}: {
  status: 'active' | 'streaming' | 'completed' | 'warning' | 'slashed';
}) {
  if (status === 'slashed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
        <ShieldX className="h-3 w-3" />
        Slashed
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
        <AlertTriangle className="h-3 w-3" />
        Warning
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
        <BadgeCheck className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === 'streaming') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 ring-1 ring-sky-200">
        <Waves className="h-3 w-3" />
        Streaming
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
      <Sparkles className="h-3 w-3" />
      Active
    </span>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Search className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">No grants match</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        Try adjusting your filters or clearing the search to see the full grant catalogue.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        Reset filters
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function computeStatus(
  g: DaoGrantCardModel,
): 'active' | 'streaming' | 'completed' | 'warning' | 'slashed' {
  if (g.hasSlashed) return 'slashed';
  if (g.hasWarning) return 'warning';
  if (g.tags.includes('completed')) return 'completed';
  if (g.isStreamingActive) return 'streaming';
  return 'active';
}

function gradeChipClass(tone: ReturnType<typeof gradeTone>) {
  if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (tone === 'amber') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (tone === 'orange') return 'bg-orange-50 text-orange-700 ring-orange-200';
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

function shortBuilder(addr: string) {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
