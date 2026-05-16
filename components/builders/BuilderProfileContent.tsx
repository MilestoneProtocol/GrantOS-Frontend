import type { BuilderProfileData } from '@/lib/builder-profile-server';
import { contributionTierLabel } from '@/lib/builder-profile-server';
import {
  ArrowUpRight,
  Calendar,
  Check,
  ExternalLink,
  GitBranch,
  Link2,
  Trophy,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

function shorten(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function arbiscanTxUrl(hash: string) {
  return `https://arbiscan.io/tx/${hash}`;
}

function reputationBarClass(score: number): string {
  if (score >= 80) return 'from-teal-400 to-emerald-500';
  if (score >= 60) return 'from-amber-300 to-amber-500';
  return 'from-rose-400 to-rose-600';
}

function ZkBadgeLarge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
        verified ? 'bg-violet-600 text-white shadow-sm' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {verified ? <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} /> : null}
      {verified ? 'ZK Verified' : 'Unverified'}
    </span>
  );
}

function StatCard({
  label,
  children,
  footer,
}: {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 min-h-[3.5rem] flex-1">{children}</div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

function GrantCard({ row }: { row: import('@/lib/builder-profile-server').BuilderProfileGrantRow }) {
  const pct =
    row.milestoneTotal > 0
      ? Math.min(100, Math.round((row.milestoneApproved / row.milestoneTotal) * 100))
      : 0;
  const rest = 100 - pct;

  const statusStyles =
    row.statusLabel === 'Completed'
      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
      : row.statusLabel === 'Slashed'
        ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-100'
        : row.statusLabel === 'Warning'
          ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-100'
          : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200/80 hover:shadow-md sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-700">{row.labelId}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles}`}>
            {row.statusLabel}
          </span>
        </div>
        <p className="font-mono text-sm font-bold text-slate-900">
          {row.totalUsdc.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
        </p>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 sm:text-base">
        {row.title}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{row.committeeCount} Committee</p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Milestone progress</span>
          <span className="font-mono normal-case text-slate-600">
            {row.milestoneApproved}/{row.milestoneTotal} approved
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-l-full bg-violet-600 transition-all"
            style={{ width: `${pct}%` }}
          />
          {row.statusLabel === 'In Progress' && rest > 0 ? (
            <div
              className="h-full bg-amber-200/90"
              style={{ width: `${Math.min(rest, 22)}%` }}
            />
          ) : null}
        </div>
      </div>

      <Link
        href={row.href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
      >
        View grant
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function WarningCard({
  row,
}: {
  row: import('@/lib/builder-profile-server').BuilderProfileWarningRow;
}) {
  const date = new Date(row.issuedAtIso);
  const dateStr = Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : row.issuedAtIso;

  return (
    <article className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4">
      <div className="flex gap-2">
        <span className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            <span className="text-amber-800">Warning</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-600">{row.grantLabel}</span>
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{row.milestoneTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{row.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{dateStr}</span>
            <a
              href={row.easUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:text-violet-900"
            >
              EAS record
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BuilderProfileContent({ data }: { data: BuilderProfileData }) {
  if (data.kind === 'invalid') {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <section className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Builder not found</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">The wallet address in this URL is not a valid checksummed Ethereum address.</p>
          <Link
            href="/grants"
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Back to explorer
          </Link>
        </section>
      </main>
    );
  }

  const {
    address,
    identity,
    hasIdentityRecord,
    verifiedAtDisplay,
    bindingTxHash,
    stats,
    grants,
    warnings,
    chainReadFailed,
    demoContributionTierLabel,
  } = data;

  const gh = identity.githubHandle.trim();
  const ghUrl = gh ? `https://github.com/${gh.replace(/^@/, '')}` : '';
  const joinedYear = identity.accountCreationYear > 0 ? String(identity.accountCreationYear) : null;
  const displayTier = hasIdentityRecord
    ? contributionTierLabel(identity.contributionTier)
    : demoContributionTierLabel ?? 'Contributor';

  const avatarSrc = gh
    ? `https://github.com/${gh.replace(/^@/, '')}.png?size=128`
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(address)}`;

  const score = Math.max(0, Math.min(100, stats.reputationScore));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm">
        <Link href="/grants" className="hover:text-slate-800">
          Builders
        </Link>
        <span aria-hidden className="text-slate-300">/</span>
        <span className="font-mono text-slate-800">{shorten(address)}</span>
      </nav>

      {chainReadFailed ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Chain data unavailable.</span> Showing explorer demo grants for this address. Configure{' '}
          <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_RPC_URL</code> for live reads.
        </p>
      ) : null}

      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <Wallet className="hidden h-5 w-5 text-slate-400 sm:block" aria-hidden />
              <h1 className="break-all font-mono text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl">
                {address}
              </h1>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ZkBadgeLarge verified={Boolean(identity.zkVerified || stats.hasZkSubmission)} />
              {!(identity.zkVerified || stats.hasZkSubmission) ? (
                <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Unverified</span>
                  {' — '}
                  this builder has not completed ZK Identity Binding or ZK milestone delivery.
                </p>
              ) : null}
            </div>

            {hasIdentityRecord ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                {gh ? (
                  <a
                    href={ghUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-violet-700 hover:text-violet-900"
                  >
                    <GitBranch className="h-4 w-4" />
                    @{gh.replace(/^@/, '')}
                    <Link2 className="h-3.5 w-3.5 opacity-70" />
                  </a>
                ) : null}
                {joinedYear ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Joined {joinedYear}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-100">
                  <Trophy className="h-3.5 w-3.5" />
                  {displayTier}
                </span>
              </div>
            ) : demoContributionTierLabel ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-100">
                  <Trophy className="h-3.5 w-3.5" />
                  {demoContributionTierLabel}
                </span>
              </div>
            ) : null}

            {hasIdentityRecord && (verifiedAtDisplay || bindingTxHash) ? (
              <div className="mt-5 flex flex-col gap-1 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {verifiedAtDisplay ? <p>Verified: {verifiedAtDisplay}</p> : null}
                {bindingTxHash ? (
                  <p className="inline-flex flex-wrap items-center gap-1">
                    Binding tx:{' '}
                    <a
                      href={arbiscanTxUrl(bindingTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-violet-700 hover:underline"
                    >
                      {bindingTxHash.slice(0, 6)}…{bindingTxHash.slice(-4)}
                    </a>
                    <ExternalLink className="inline h-3 w-3 text-violet-600" />
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative mx-auto shrink-0 lg:mx-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner sm:h-28 sm:w-28">
              <img
                src={avatarSrc}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Reputation score"
          footer={
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${reputationBarClass(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          }
        >
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{stats.reputationScore || '—'}</span>
            {stats.letterGrade !== '—' ? (
              <span className="text-lg font-bold text-slate-500">{stats.letterGrade}</span>
            ) : null}
          </div>
        </StatCard>

        <StatCard label="Delivery rate" footer={<p className="text-xs text-slate-500">{stats.deliveryDetail}</p>}>
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.deliveryRatePercent !== null ? `${stats.deliveryRatePercent}%` : '—'}
          </p>
        </StatCard>

        <StatCard label="Total USDC earned" footer={<p className="text-xs text-slate-500">Approved milestones only</p>}>
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.totalUsdcEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </StatCard>

        <StatCard
          label="ZK proofs submitted"
          footer={
            stats.hasZkSubmission ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                <Check className="h-3 w-3" />
                ZK verified
              </span>
            ) : null
          }
        >
          <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.zkProofsSubmitted}</p>
        </StatCard>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <section>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Grant history</h2>
          {grants.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
              No grants found for this builder on-chain or in the public explorer catalogue.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {grants.map((row) => (
                <GrantCard key={`${row.source}-${row.href}`} row={row} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Warning history</h2>
          {warnings.length === 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-6">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">No warnings issued</span>
                {' — '}
                clean record.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {warnings.map((w) => (
                <WarningCard key={w.id} row={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
