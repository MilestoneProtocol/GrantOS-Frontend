'use client';

import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Public marketing landing for `/` (pre-wallet-connection state).
 *
 * Designed to feel editorial and premium: large dual-tone headline (sans + italic serif),
 * radial gradient + grid backdrop, a live-feeling proof-card mockup, and rich
 * sections (stats / features / how it works / live activity / CTA / footer).
 */
export default function LandingPage() {
  return (
    <div className="relative w-full">
      <HeroSection />
      <TrustStrip />
      <FeatureSection />
      <HowItWorksSection />
      <ActivityTicker />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}

/* ------------------------------- HERO ------------------------------- */

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Backdrop layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#dbeafe,transparent_72%)]" />
        <div className="absolute right-[-220px] top-[120px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,#ede9fe,transparent_72%)]" />
        <div className="absolute left-[-160px] bottom-[-80px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,#fef3c7,transparent_72%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.16]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grantos-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grantos-grid)" />
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          {/* Left — headline + CTAs */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
              <span
                aria-hidden
                className="relative h-1.5 w-1.5 rounded-full bg-emerald-500 animate-grantos-pulse"
              />
              Live on Arbitrum One
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">v3 release</span>
            </div>

            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.02] tracking-tight text-slate-900 sm:text-[3.25rem] lg:text-[3.85rem]">
              Grant delivery,
              <br />
              <span className="font-serif italic text-slate-900">
                cryptographically&nbsp;proven.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-[17px]">
              GrantOS is the first onchain grant protocol that enforces milestone delivery
              with <span className="font-semibold text-slate-900">cryptographic proofs</span>{' '}
              — not trust, not screenshots, not committee opinion. Funds unlock the moment
              evidence verifies onchain.
            </p>

            <p className="mt-8 max-w-md text-sm font-medium leading-relaxed text-slate-600">
              When you are ready, connect your wallet or browse public grants from the top bar.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <div className="inline-flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-emerald-500" />
                <span>
                  <span className="font-bold text-slate-900">$4.2M+</span> locked in escrow
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-violet-500" />
                <span>
                  <span className="font-bold text-slate-900">8,944</span> ZK proofs verified
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-500" />
                <span>
                  <span className="font-bold text-slate-900">186</span> active grants
                </span>
              </div>
            </div>
          </div>

          {/* Right — floating proof card mockup */}
          <div className="relative">
            <ProofCardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofCardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[36px] bg-linear-to-br from-indigo-200/60 via-violet-200/40 to-amber-100/40 blur-2xl"
      />

      <div className="animate-grantos-float rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.18)] sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Grant · #GRT-8692
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              Cross-Chain Yield Aggregator
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Streaming
          </span>
        </div>

        {/* Milestone progress */}
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Milestone 2 · ZK Proof</p>
            <p className="font-mono text-[11px] text-slate-500">$15,000 USDC</p>
          </div>
          <div className="mt-3 space-y-3">
            <ProofRow
              icon={<FileCheck2 className="h-3.5 w-3.5" />}
              label="Source attested"
              detail="vlayer · GitHub PR #315"
              done
            />
            <ProofRow
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="ZK circuit verified"
              detail="0x5b4e…a3b on Arbitrum"
              done
            />
            <ProofRow
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="Committee quorum"
              detail="3 of 4 votes received"
              progress
            />
            <ProofRow
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
              label="Stream resumes"
              detail="$0.000014 USDC/sec"
              pending
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-[#33211d] to-[#f0b46b] text-[10px] font-bold text-white">
              4A
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-900">
                0x4A2b…6F7a
              </p>
              <p className="truncate text-[10px] text-slate-500">Tier 2 · Rep 84</p>
            </div>
          </div>
          <Link
            href="/grants"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Open grant
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Small floating chip */}
      <div className="pointer-events-none absolute -left-4 top-10 hidden -rotate-6 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg animate-grantos-float sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Proof verified</p>
            <p className="text-slate-500">in 3.2s · 0 disputes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProofRow({
  icon,
  label,
  detail,
  done,
  progress,
  pending,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  done?: boolean;
  progress?: boolean;
  pending?: boolean;
}) {
  const tone = done
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : progress
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-slate-100 text-slate-500 ring-slate-200';
  const statusLabel = done ? 'Verified' : progress ? 'Pending quorum' : 'Queued';

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ${
            done
              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
              : progress
                ? 'bg-amber-100 text-amber-700 ring-amber-200'
                : 'bg-slate-100 text-slate-500 ring-slate-200'
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : icon}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold text-slate-900">{label}</p>
          <p className="truncate text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${tone}`}
      >
        {statusLabel}
      </span>
    </div>
  );
}

/* ----------------------------- TRUST STRIP ----------------------------- */

function TrustStrip() {
  const stats = [
    { value: '$4.2M+', label: 'USDC in escrow' },
    { value: '186', label: 'Active grants' },
    { value: '8,944', label: 'ZK proofs verified' },
    { value: '$48,144', label: 'Recovered via slash' },
  ];

  return (
    <section className="relative border-y border-slate-200/80 bg-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-none bg-slate-200/80 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-start justify-between gap-1 bg-white px-5 py-6 sm:px-8 sm:py-8"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {s.label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ FEATURES ------------------------------ */

function FeatureSection() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          Why GrantOS
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Funding that <span className="font-serif italic">verifies itself.</span>
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Three primitives, working together. Every dollar moves only when the chain says so.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <FeatureCard
          accent="indigo"
          icon={<ShieldCheck className="h-5 w-5" />}
          eyebrow="ZK Proof Verification"
          title="Submit evidence, not screenshots"
          body="Builders generate zero-knowledge proofs of work — commits, deployments, metrics, web data. Committees verify math, not vibes."
          tags={['vlayer Web Prover', 'EAS Attestations', 'Arbitrum One']}
        />
        <FeatureCard
          accent="emerald"
          icon={<CircleDollarSign className="h-5 w-5" />}
          eyebrow="Streaming Payments"
          title="Funds flow when work flows"
          body="Lump-sum or per-second streaming via Superfluid. Once a milestone verifies, value moves on the next block — no 30-day signoff."
          tags={['USDC by default', 'Superfluid streams', 'Real-time accrual']}
        />
        <FeatureCard
          accent="violet"
          icon={<Scale className="h-5 w-5" />}
          eyebrow="Cryptographic Due Process"
          title="Disputes that can't be ignored"
          body="Warnings become onchain attestations with a 24h cool-off. If evidence still fails, slashes return funds to the treasury — auditable forever."
          tags={['24h cool-off', 'On-chain warnings', 'Treasury safe-by-default']}
        />
      </div>
    </section>
  );
}

function FeatureCard({
  accent,
  icon,
  eyebrow,
  title,
  body,
  tags,
}: {
  accent: 'indigo' | 'emerald' | 'violet';
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  tags: string[];
}) {
  const accentMap = {
    indigo: {
      ring: 'group-hover:ring-indigo-200',
      iconBg: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      glow: 'from-indigo-100/70 via-white to-white',
    },
    emerald: {
      ring: 'group-hover:ring-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      glow: 'from-emerald-100/70 via-white to-white',
    },
    violet: {
      ring: 'group-hover:ring-violet-200',
      iconBg: 'bg-violet-50 text-violet-700 ring-violet-200',
      glow: 'from-violet-100/70 via-white to-white',
    },
  }[accent];

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-lg ${accentMap.ring}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-linear-to-br opacity-0 transition group-hover:opacity-100 ${accentMap.glow}`}
      />
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset ${accentMap.iconBg}`}
      >
        {icon}
      </div>
      <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="relative mt-2 text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}

/* ---------------------------- HOW IT WORKS ---------------------------- */

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      title: 'Create grant',
      body: 'Define milestones, committee, payment mode. Escrowed onchain at submission.',
      icon: <Workflow className="h-4 w-4" />,
    },
    {
      n: '02',
      title: 'Build & prove',
      body: 'Submit a ZK proof of completed work — code, contribution, metrics, or attestation.',
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      n: '03',
      title: 'Verify onchain',
      body: 'Committee confirms math, not vibes. Quorum signs cryptographically.',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      n: '04',
      title: 'Funds release',
      body: 'USDC streams or unlocks on success. Slashing returns treasury on failure.',
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
  ];

  return (
    <section className="relative border-y border-slate-200/80 bg-slate-50/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Four steps. Zero handshakes.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-600">
            From grant creation to milestone payout — every action is signed, attested, and replayable.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-3xl italic text-slate-300">{s.n}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  {s.icon}
                </span>
              </div>
              <h3 className="mt-5 text-base font-bold tracking-tight text-slate-900">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{s.body}</p>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute right-4 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-slate-200 lg:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------- ACTIVITY ---------------------------- */

const ACTIVITY = [
  { dot: 'bg-emerald-500', text: 'Milestone 2 verified', sub: 'Yield Aggregator · 0x5b4e…a3b' },
  { dot: 'bg-violet-500', text: 'ZK proof accepted', sub: 'PR #315 · vlayer prover' },
  { dot: 'bg-sky-500', text: 'Stream resumed', sub: '$0.000014/sec · USDC' },
  { dot: 'bg-amber-500', text: 'Warning recorded', sub: 'Cool-off ends in 23h' },
  { dot: 'bg-rose-500', text: 'Slash executed', sub: '$4,000 returned to treasury' },
  { dot: 'bg-emerald-500', text: 'Quorum reached', sub: '3 of 4 committee signatures' },
];

function ActivityTicker() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="relative h-2 w-2 rounded-full bg-emerald-500 animate-grantos-pulse"
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Live activity
          </p>
        </div>
        <div className="relative mt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-white to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-white to-transparent"
          />
          <div className="overflow-hidden">
            <div className="flex w-max gap-3 animate-grantos-marquee">
              {[...ACTIVITY, ...ACTIVITY].map((a, i) => (
                <div
                  key={`${a.text}-${i}`}
                  className="inline-flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                  <div className="leading-tight">
                    <p className="font-semibold text-slate-900">{a.text}</p>
                    <p className="text-xs text-slate-500">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ CTA BAND ------------------------------ */

function CtaBand() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-10">
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/3 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.55),transparent_70%)]" />
          <div className="absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.45),transparent_70%)]" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grantos-grid-dark" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grantos-grid-dark)" />
          </svg>
        </div>

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">
              Ready to ship?
            </p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Bring your grant <span className="font-serif italic">onchain</span> — get paid
              the moment proofs verify.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/70">
              Connect a wallet to open your dashboard, or browse public grants to see what the
              protocol enforces in production today — use the sticky header on any page.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  Protocol guarantee
                </p>
                <Lock className="h-4 w-4 text-white/60" />
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[
                  'Escrow on Arbitrum One — funds never leave until proof verifies.',
                  '24h on-chain warnings before any slash.',
                  'Every action attested via EAS for permanent audit.',
                  'Committee actions are public; identity is ZK-verified.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-white/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- FOOTER ------------------------------- */

function SiteFooter() {
  return (
    <footer className="relative border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              G
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              GrantOS
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
            The onchain grant protocol. Built for DAOs that prefer math over meetings.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Operating on Arbitrum One
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { label: 'Explore Grants', href: '/grants' },
            { label: 'Verification', href: '/verify' },
            { label: 'Builder Dashboard', href: '/builder' },
            { label: 'Committee', href: '/committee' },
          ]}
        />
        <FooterCol
          title="Protocol"
          links={[
            { label: 'GrantEscrow.sol', href: '#' },
            { label: 'GrantIdentityRegistry.sol', href: '#' },
            { label: 'EAS schema registry', href: '#' },
            { label: 'Audit reports', href: '#' },
          ]}
        />
        <FooterCol
          title="Resources"
          links={[
            { label: 'Documentation', href: '#' },
            { label: 'Brand kit', href: '#' },
            { label: 'Discord', href: '#' },
            { label: 'GitHub', href: '#' },
          ]}
        />
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-10">
          <span>© {new Date().getFullYear()} GrantOS Protocol. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="#" className="hover:text-slate-800">
              Terms
            </Link>
            <Link href="#" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link href="#" className="hover:text-slate-800">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
