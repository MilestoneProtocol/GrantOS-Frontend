'use client';

import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Compass,
  Eye,
  GitBranch,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
  Vote,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';

type RoleTone = 'indigo' | 'sky' | 'violet';

const TONE = {
  indigo: {
    border: 'border-indigo-200',
    halo: 'from-indigo-200/60 via-white to-white',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    iconBg: 'bg-indigo-600 text-white',
    button: 'bg-indigo-600 hover:bg-indigo-700',
  },
  sky: {
    border: 'border-sky-200',
    halo: 'from-sky-200/60 via-white to-white',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    iconBg: 'bg-sky-600 text-white',
    button: 'bg-sky-600 hover:bg-sky-700',
  },
  violet: {
    border: 'border-violet-200',
    halo: 'from-violet-200/60 via-white to-white',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
    iconBg: 'bg-violet-600 text-white',
    button: 'bg-violet-600 hover:bg-violet-700',
  },
} as const;

export default function RoleSelection({
  showDaoCard,
  builderUnverifiedNudge,
}: {
  showDaoCard: boolean;
  builderUnverifiedNudge: boolean;
}) {
  const { address } = useAccount();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return (
    <div className="relative isolate w-full overflow-hidden">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#dbeafe,transparent_70%)]" />
        <div className="absolute right-[-200px] top-[80px] h-[440px] w-[440px] rounded-full bg-[radial-gradient(closest-side,#ede9fe,transparent_70%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="rs-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rs-grid)" />
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              Wallet connected
              {short ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-slate-600">{short}</span>
                </>
              ) : null}
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-[1.05]">
              Welcome in.
              <br />
              <span className="font-serif italic">How would you like to continue?</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Your wallet can act in multiple roles on GrantOS. Pick the surface that
              matches what you’re here to do — you can switch anytime.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Protocol on Arbitrum One
            </div>
            <p className="text-slate-500">
              All role decisions are local — no transactions until you act.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <RoleTile
            tone="indigo"
            eyebrow="Builder"
            title="I am a Builder"
            description="Submit ZK proofs of completed work, track milestones, and grow an onchain reputation that opens future grants."
            features={[
              { icon: <GitBranch className="h-3.5 w-3.5" />, label: 'Submit milestone proofs' },
              { icon: <CircleDollarSign className="h-3.5 w-3.5" />, label: 'Receive streamed USDC' },
              { icon: <BadgeCheck className="h-3.5 w-3.5" />, label: 'ZK-verified identity' },
            ]}
            ctaLabel={builderUnverifiedNudge ? 'Verify Identity First' : 'Go to Builder'}
            href={builderUnverifiedNudge ? '/verify' : '/builder'}
            badge={
              builderUnverifiedNudge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Verify required
                </span>
              ) : null
            }
            icon={<Wrench className="h-5 w-5" strokeWidth={2.2} />}
          />

          <RoleTile
            tone="sky"
            eyebrow="Committee"
            title="I am a Committee Member"
            description="Review ZK evidence, vote with quorum, issue warnings, and enforce due process on milestones you’re assigned to."
            features={[
              { icon: <Vote className="h-3.5 w-3.5" />, label: 'Quorum-based voting' },
              { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'EAS warning attestations' },
              { icon: <Users className="h-3.5 w-3.5" />, label: 'Approve milestone releases' },
            ]}
            ctaLabel="Go to Committee"
            href="/committee"
            icon={<Users className="h-5 w-5" strokeWidth={2.2} />}
          />
        </div>

        {showDaoCard ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_minmax(0,340px)]">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-linear-to-br from-violet-100 via-white to-white"
              />
              <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Layers className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      DAO Admin
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                      I oversee multiple grants
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Monitor treasury flow, slashing outcomes, and protocol-wide grant
                      health. DAO Admins serve on three or more grant committees.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dao"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
                >
                  View DAO Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <ObserverCard />
          </div>
        ) : (
          <div className="mt-5">
            <ObserverCard />
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          You can revisit this screen anytime from the sidebar — nothing is committed until
          you sign.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ pieces ------------------------------ */

function RoleTile({
  tone,
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  href,
  badge,
  icon,
}: {
  tone: RoleTone;
  eyebrow: string;
  title: string;
  description: string;
  features: { icon: React.ReactNode; label: string }[];
  ctaLabel: string;
  href: string;
  badge?: React.ReactNode;
  icon: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-22px_rgba(15,23,42,0.18)] sm:p-7 ${t.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-linear-to-br ${t.halo} opacity-0 transition group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${t.iconBg}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        {badge}
      </div>

      <p className="relative mt-4 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>

      <ul className="relative mt-5 space-y-2">
        {features.map((f) => (
          <li
            key={f.label}
            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset ${t.chip}`}
            >
              {f.icon}
            </span>
            {f.label}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`relative mt-6 inline-flex w-full items-center justify-between gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${t.button}`}
      >
        <span>{ctaLabel}</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}

function ObserverCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Eye className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Observer
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-slate-900">
              Browse as Observer
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Read-only view of public grants, milestones, and proofs.
            </p>
          </div>
        </div>
        <Link
          href="/grants"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Open Explorer
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
