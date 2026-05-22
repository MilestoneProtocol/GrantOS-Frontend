'use client';

import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import ReputationBadge from '@/components/ReputationBadge';
import { useBuilderReputation } from '@/hooks/useBuilderReputation';
import { easAttestationScanUrl } from '@/lib/eas-scan';
import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';

function parseAddress(raw: string): string | null {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed || !/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}


function formatDate(ts: string | number) {
  const timestamp = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (timestamp <= 0) return '—';
  return new Date(timestamp * 1000).toLocaleDateString();
}

function arbiscanTx(hash: string) {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}

export default function BuilderProfilePage() {
  const params = useParams<{ address: string }>();
  const rawAddress = params?.address ?? '';
  const address = useMemo(() => parseAddress(rawAddress), [rawAddress]);

  const { data: reputation, isLoading } = useBuilderReputation(address);

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: Boolean(address) },
  });

  const identity = identityData as
    | { isVerified: boolean; tier: bigint; githubHandle: string }
    | undefined;

  if (!address) {
    return (
      <OnboardingShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">Invalid Address</h1>
              <p className="mt-2 text-sm text-slate-500">
                Please provide a valid Ethereum address.
              </p>
              <Link
                href="/grants"
                className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Back to explorer
              </Link>
            </div>
          </div>
        </main>
      </OnboardingShell>
    );
  }

  if (isLoading) {
    return (
      <OnboardingShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading builder profile...
              </p>
            </div>
          </div>
        </main>
      </OnboardingShell>
    );
  }

  if (!reputation) {
    return (
      <OnboardingShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">No Data Found</h1>
              <p className="mt-2 text-sm text-slate-500">
                This builder has no grant history yet.
              </p>
              <Link
                href="/grants"
                className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Back to explorer
              </Link>
            </div>
          </div>
        </main>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/grants"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to explorer
          </Link>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Builder Profile
              </div>
              <h1 className="mt-3 font-mono text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {shortenAddress(address)}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ReputationBadge
                  score={reputation.score}
                  letterGrade={reputation.letterGrade}
                  size="lg"
                  zkVerified={identity?.isVerified || reputation.zkVerified}
                />
                {identity?.isVerified && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    ZK Verified
                  </div>
                )}
                {identity && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Tier {identity.tier.toString()}
                  </div>
                )}
              </div>
              {identity?.githubHandle && (
                <p className="mt-3 text-sm text-slate-600">
                  GitHub:{' '}
                  <a
                    href={`https://github.com/${identity.githubHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-900 hover:underline"
                  >
                    @{identity.githubHandle}
                  </a>
                </p>
              )}
            </div>

            {/* Score Display */}
            <div className="text-center sm:text-right">
              <p className="text-sm font-medium text-slate-500">Reputation Score</p>
              <p className="mt-1 text-5xl font-bold tracking-tight text-slate-900">
                {reputation.score}
              </p>
              <p className="mt-1 text-xs text-slate-500">out of 100</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Delivery Rate"
              value={`${reputation.deliveryRate}%`}
              color="emerald"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="On-Time Approvals"
              value={reputation.breakdown.approvedOnTime.toString()}
              color="emerald"
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="ZK Proofs"
              value={reputation.breakdown.zkProofsSubmitted.toString()}
              color="violet"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Warnings"
              value={reputation.breakdown.warningsReceived.toString()}
              color="amber"
            />
          </div>

          {/* Score Breakdown */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Score Breakdown
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              <BreakdownRow
                label="Approved on-time"
                count={reputation.breakdown.approvedOnTime}
                points={10}
                color="emerald"
              />
              <BreakdownRow
                label="Approved late"
                count={reputation.breakdown.approvedLate}
                points={4}
                color="sky"
              />
              <BreakdownRow
                label="ZK proofs submitted"
                count={reputation.breakdown.zkProofsSubmitted}
                points={2}
                color="violet"
              />
              <BreakdownRow
                label="Rejected"
                count={reputation.breakdown.rejected}
                points={-3}
                color="orange"
              />
              <BreakdownRow
                label="Warnings received"
                count={reputation.breakdown.warningsReceived}
                points={-5}
                color="amber"
              />
              <BreakdownRow
                label="Slashed"
                count={reputation.breakdown.slashed}
                points={-15}
                color="red"
              />
              <div className="border-t border-slate-300 pt-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>Total Points</span>
                  <span>{reputation.breakdown.totalPoints}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full History */}
        <div className="mt-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Complete Delivery History
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Every milestone, every proof, every outcome — 100% derived from on-chain EAS
            attestations
          </p>

          <div className="mt-4 space-y-3">
            {reputation.history.map((entry, idx) => (
              <HistoryCard key={`${entry.grantId}-${entry.milestoneIndex}`} entry={entry} />
            ))}
          </div>
        </div>
      </main>
    </OnboardingShell>
  );

}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ring-1 ring-inset ${colorClasses[color as keyof typeof colorClasses]}`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  points,
  color,
}: {
  label: string;
  count: number;
  points: number;
  color: string;
}) {
  const total = count * points;
  const sign = total > 0 ? '+' : '';

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">
        {label} ({count} × {points > 0 ? '+' : ''}
        {points})
      </span>
      <span className={`font-semibold ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        {sign}
        {total}
      </span>
    </div>
  );
}

function HistoryCard({ entry }: { entry: any }) {
  const outcomeConfig = {
    approved_on_time: {
      icon: CheckCircle2,
      label: 'Approved On-Time',
      color: 'emerald',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'ring-emerald-200',
    },
    approved_late: {
      icon: Clock,
      label: 'Approved Late',
      color: 'sky',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      ring: 'ring-sky-200',
    },
    rejected: {
      icon: XCircle,
      label: 'Rejected',
      color: 'red',
      bg: 'bg-red-50',
      text: 'text-red-700',
      ring: 'ring-red-200',
    },
    warned: {
      icon: AlertTriangle,
      label: 'Warning Issued',
      color: 'amber',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'ring-amber-200',
    },
    slashed: {
      icon: Gavel,
      label: 'Slashed',
      color: 'red',
      bg: 'bg-red-50',
      text: 'text-red-700',
      ring: 'ring-red-200',
    },
    pending: {
      icon: Clock,
      label: 'Pending',
      color: 'slate',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      ring: 'ring-slate-200',
    },
  };

  const config = outcomeConfig[entry.outcome as keyof typeof outcomeConfig];
  const Icon = config.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/grants/${entry.grantId}`}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Grant #{entry.grantId}
            </Link>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-600">Milestone {entry.milestoneIndex + 1}</span>
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">{entry.milestoneTitle}</h3>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {entry.submittedAt && (
              <span className="text-slate-600">
                Submitted: {new Date(entry.submittedAt).toLocaleDateString()}
              </span>
            )}
            <span className="text-slate-600">Deadline: {formatDate(entry.deadline)}</span>
            {entry.zkProofSubmitted && (
              <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                <ShieldCheck className="h-3 w-3" />
                ZK Proof
              </div>
            )}
          </div>

          {/* Transaction Links */}
          {(entry.txHash || entry.easAttestationUid) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.txHash && (
                <a
                  href={arbiscanTx(entry.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  View TX
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {entry.easAttestationUid && (
                <a
                  href={easAttestationScanUrl(entry.easAttestationUid as `0x${string}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  EAS Attestation
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </div>
          <div
            className={`text-lg font-bold ${entry.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {entry.points > 0 ? '+' : ''}
            {entry.points}
          </div>
        </div>
      </div>
    </div>
  );
}
