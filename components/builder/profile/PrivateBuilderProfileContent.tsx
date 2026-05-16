'use client';

import ProfileActiveWarnings from '@/components/builder/profile/ProfileActiveWarnings';
import ProfileStatSkeleton from '@/components/builder/profile/ProfileStatSkeleton';
import ReverifyIdentityModal from '@/components/builder/profile/ReverifyIdentityModal';
import {
  CONTRIBUTION_TIERS,
  tierRangeLabel,
  type ContributionTierDef,
} from '@/lib/builder-contribution-tiers';
import { useBuilderPrivateProfile } from '@/hooks/useBuilderPrivateProfile';
import type { ReputationScoreEvent } from '@/lib/reputation';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  Lock,
  Shield,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

function arbiscanTxUrl(hash: string) {
  return `https://arbiscan.io/tx/${hash}`;
}

function reputationBarClass(score: number): string {
  if (score >= 80) return 'from-amber-400 via-lime-400 to-emerald-500';
  if (score >= 60) return 'from-amber-300 to-amber-500';
  return 'from-rose-400 to-rose-600';
}

function gradeBadgeClass(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-500 text-white';
  if (grade.startsWith('B')) return 'bg-sky-500 text-white';
  if (grade.startsWith('C')) return 'bg-amber-500 text-white';
  return 'bg-slate-500 text-white';
}

function formatUsdc(n: number, decimals = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatEventLabel(kind: ReputationScoreEvent['kind']): string {
  const map: Record<ReputationScoreEvent['kind'], string> = {
    MilestoneApprovedOnTime: 'Milestone Approved',
    MilestoneApprovedLate: 'Milestone Approved (Late)',
    ZKProofSubmitted: 'ZK Proof Validated',
    MilestoneRejected: 'Milestone Rejected',
    WarningIssued: 'Warning Issued',
    MilestoneSlashed: 'Milestone Slashed',
  };
  return map[kind] ?? kind;
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (86400 * 1000));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}



function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy wallet address'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function ProfileEmptyState() {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <Shield className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
      <h2 className="mt-4 text-xl font-bold text-slate-900">No builder profile yet</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Verify your GitHub identity to unlock your private builder hub — reputation, earnings, and
        grant history live here once you are on-chain.
      </p>
      <Link
        href="/verify"
        className="mt-6 inline-flex items-center gap-1 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        Start by verifying your identity →
      </Link>
    </section>
  );
}

type PrivateBuilderProfileContentProps = {
  address: `0x${string}`;
};

export default function PrivateBuilderProfileContent({
  address,
}: PrivateBuilderProfileContentProps) {
  const router = useRouter();
  const profile = useBuilderPrivateProfile();
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [streamTotal, setStreamTotal] = useState(0);

  const {
    identity,
    identityLoading,
    profileLoading,
    hasProfileContent,
    earnings,
    stats,
    contributionTier,
    reputation,
    reputationLoading,
    computeStreamTotal,
  } = profile;

  const score = Math.max(0, Math.min(100, stats.reputationScore));
  const gh = identity?.githubHandle?.trim() ?? '';
  const ghDisplay = gh ? `@${gh.replace(/^@/, '')}` : '';
  const ghUrl = gh ? `https://github.com/${gh.replace(/^@/, '')}` : '';
  const joinedYear =
    identity?.accountCreationYear && identity.accountCreationYear > 0
      ? String(identity.accountCreationYear)
      : null;

  const avatarSrc = gh
    ? `https://github.com/${gh.replace(/^@/, '')}.png?size=160`
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(address)}`;

  const publicProfileHref = `/builders/${address}`;

  useEffect(() => {
    if (!earnings.currentlyStreaming.value.active) {
      setStreamTotal(earnings.currentlyStreaming.value.accumulatedUsdc);
      return;
    }
    setStreamTotal(computeStreamTotal());
    const id = window.setInterval(() => {
      setStreamTotal(computeStreamTotal());
    }, 100);
    return () => window.clearInterval(id);
  }, [computeStreamTotal, earnings.currentlyStreaming.value.active]);

  const reputationEvents =
    reputation?.events?.slice(-5).reverse() ??
    (hasProfileContent ? [] : []);

  const displayEvents =
    reputationEvents.length > 0
      ? reputationEvents.map((e) => ({
          label: formatEventLabel(e.kind),
          delta: e.delta,
          ago: formatRelativeTime(e.timestampMs),
          positive: e.delta >= 0,
        }))
      : [];

  const handleReverifyConfirm = useCallback(() => {
    setReverifyOpen(false);
    router.push('/verify');
  }, [router]);

  if ((identityLoading || profileLoading) && !hasProfileContent) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading your profile…
      </div>
    );
  }

  if (!hasProfileContent) {
    return <ProfileEmptyState />;
  }

  return (
  <>
    <ReverifyIdentityModal
      open={reverifyOpen}
      onCancel={() => setReverifyOpen(false)}
      onConfirm={handleReverifyConfirm}
    />

    <div className="w-full space-y-5 sm:space-y-6">
      <ProfileActiveWarnings />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">
          Private Builder Hub
        </h1>
        <p className="text-sm text-slate-500">
          Your identity, earnings, and reputation — visible only to you.
        </p>
      </header>

      {/* Profile header */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative mx-auto shrink-0 sm:mx-0">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner sm:h-28 sm:w-28">
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" width={112} height={112} />
              </div>
              {identity?.zkVerified ? (
                <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                  <Shield className="h-3 w-3" />
                  ZK Verified
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="break-all font-mono text-base font-bold text-slate-900 sm:text-lg">
                  {address}
                </p>
                <CopyAddressButton address={address} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start">
                {ghUrl ? (
                  <a
                    href={ghUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <GitBranch className="h-4 w-4" />
                    {ghDisplay}
                  </a>
                ) : null}
                {joinedYear ? (
                  <span className="text-slate-500">Joined {joinedYear}</span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-200/80">
                  {contributionTier.label} Tier
                </span>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 lg:max-w-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Reputation Score</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                    {identityLoading ? '—' : stats.reputationScore || '—'}
                  </span>
                  {stats.letterGrade !== '—' ? (
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${gradeBadgeClass(stats.letterGrade)}`}
                    >
                      {stats.letterGrade.replace('+', '')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${reputationBarClass(score)} transition-all`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                <span className="font-bold text-slate-900">
                  {stats.deliveryRatePercent != null ? `${stats.deliveryRatePercent}%` : '—'}
                </span>{' '}
                Delivery Rate
              </span>
              <span>
                <span className="font-bold text-slate-900">{stats.zkProofsSubmitted}</span> ZK Proofs
              </span>
            </div>
            <a
              href={publicProfileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
            >
              View Public Profile
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-5 lg:col-span-5 xl:col-span-4">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-slate-900">Your Verified Identity</h2>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Bound GitHub Handle
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {ghDisplay || '—'}
                </span>
                {gh ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : null}
              </div>
            </div>

            <div className="mt-4 space-y-1 text-xs text-slate-500">
              {identity?.verifiedAtDisplay ? (
                <p>Verified Since {identity.verifiedAtDisplay}</p>
              ) : null}
              {identity?.bindingTxHash ? (
                <p className="flex flex-wrap items-center gap-1">
                  Binding Tx{' '}
                  <a
                    href={arbiscanTxUrl(identity.bindingTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-semibold text-teal-700 hover:underline"
                  >
                    {identity.bindingTxHash.slice(0, 8)}…{identity.bindingTxHash.slice(-6)}
                  </a>
                  <ExternalLink className="inline h-3 w-3 text-teal-600" />
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-700">Contribution Tier</p>
              <ul className="mt-2 space-y-1.5">
                {CONTRIBUTION_TIERS.map((tier) => (
                  <TierRow key={tier.id} tier={tier} active={tier.id === contributionTier.id} />
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setReverifyOpen(true)}
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Re-verify Identity
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-slate-900">Reputation Snapshot</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums text-slate-900">
                {reputationLoading ? '—' : stats.reputationScore}
              </span>
              {stats.letterGrade !== '—' ? (
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${gradeBadgeClass(stats.letterGrade)}`}
                >
                  {stats.letterGrade.replace('+', '')}
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${reputationBarClass(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>

            <ul className="mt-5 divide-y divide-slate-100">
              {reputationLoading ? (
                <li className="py-6 text-center text-sm text-slate-400">Loading events…</li>
              ) : displayEvents.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-400">No recent events</li>
              ) : (
                displayEvents.map((ev, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          ev.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {ev.positive ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{ev.label}</p>
                        <p className="text-xs text-slate-500">{ev.ago}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold tabular-nums ${
                        ev.positive ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {ev.positive ? '+' : ''}
                      {ev.delta}
                    </span>
                  </li>
                ))
              )}
            </ul>

            <a
              href={`${publicProfileHref}#reputation`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              View Full Reputation History →
            </a>
          </section>
        </div>

        {/* Right column — earnings */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 lg:col-span-7 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">Earnings &amp; Escrow</h2>
            <span className="text-[11px] font-medium text-slate-500">All values in USDC</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {earnings.totalUsdcEarned.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Total USDC Earned"
                value={`$${formatUsdc(earnings.totalUsdcEarned.value)}`}
                sub={`Across ${stats.approvedMilestones} approved milestones`}
                icon={<Trophy className="h-4 w-4 text-slate-400" />}
              />
            )}

            {earnings.currentlyStreaming.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Currently Streaming"
                value={`$${formatUsdc(streamTotal, 3)}`}
                sub={`${earnings.currentlyStreaming.value.rateUsdcPerSec.toFixed(4)} USDC/sec`}
                highlight={earnings.currentlyStreaming.value.active}
                pulse={earnings.currentlyStreaming.value.active}
                icon={
                  earnings.currentlyStreaming.value.active ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                  ) : (
                    <Globe className="h-4 w-4 text-slate-400" />
                  )
                }
                valueClassName={
                  earnings.currentlyStreaming.value.active ? 'text-emerald-600' : undefined
                }
              />
            )}

            {earnings.pendingInEscrow.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Pending in Escrow"
                value={`$${formatUsdc(earnings.pendingInEscrow.value)}`}
                sub={`Locked in ${stats.activeGrants} active grants`}
                icon={<Lock className="h-4 w-4 text-slate-400" />}
              />
            )}

            {earnings.largestSingleGrant.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Largest Single Grant"
                value={`$${formatUsdc(earnings.largestSingleGrant.value.amount)}`}
                sub={earnings.largestSingleGrant.value.title}
                icon={<Award className="h-4 w-4 text-slate-400" />}
              />
            )}

            {earnings.averageMilestoneValue.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Average Milestone"
                value={`$${formatUsdc(earnings.averageMilestoneValue.value)}`}
                sub="Based on historical data"
                icon={<Globe className="h-4 w-4 text-slate-400" />}
              />
            )}

            {earnings.totalGrantsCompleted.loading ? (
              <ProfileStatSkeleton />
            ) : (
              <EarningsTile
                label="Total Grants Completed"
                value={String(earnings.totalGrantsCompleted.value.count)}
                sub={
                  earnings.totalGrantsCompleted.value.completionRate != null
                    ? `${earnings.totalGrantsCompleted.value.completionRate}% completion rate`
                    : 'Completion rate unavailable'
                }
                icon={<Check className="h-4 w-4 text-slate-400" />}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  </>
  );
}

function TierRow({ tier, active }: { tier: ContributionTierDef; active: boolean }) {
  return (
    <li
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        active
          ? 'bg-violet-50 font-semibold text-violet-900 ring-1 ring-violet-200/80'
          : 'text-slate-600'
      }`}
    >
      <span>{tier.label}</span>
      <span className={`text-xs ${active ? 'text-violet-700' : 'text-slate-400'}`}>
        {tierRangeLabel(tier)}
      </span>
    </li>
  );
}

function EarningsTile({
  label,
  value,
  sub,
  icon,
  highlight,
  pulse,
  valueClassName,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  pulse?: boolean;
  valueClassName?: string;
}) {
  return (
    <article
      className={`relative rounded-xl border p-4 ${
        highlight
          ? 'border-emerald-200/80 bg-emerald-50/40'
          : 'border-slate-200/90 bg-slate-50/50'
      } ${pulse ? 'animate-grantos-pulse' : ''}`}
    >
      {icon ? (
        <span className="absolute right-3 top-3" aria-hidden>
          {icon}
        </span>
      ) : null}
      <p className="pr-8 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[1.65rem] ${valueClassName ?? ''}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-slate-500">{sub}</p>
    </article>
  );
}
