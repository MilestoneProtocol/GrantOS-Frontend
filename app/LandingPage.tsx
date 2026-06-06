'use client';

import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Compass,
  Eye,
  GitBranch,
  Check,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Vote,
} from 'lucide-react';
import Link from 'next/link';

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

/**
 * Public landing for `/` before wallet connect.
 * Visual system matches `RoleSelection` — grid backdrop, rounded-3xl
 * role tiles, serif headline accent, and sky / indigo / violet tones.
 */
export default function LandingPage() {
  return (
    <div className="relative isolate w-full overflow-hidden">
      <LandingBackdrop />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        <LandingHeader />
        <EntryPathCards />
        <ProtocolMetrics />
        <PrimitivesSection />
        <LifecycleSection />
        <ConnectCta />
        <LandingFooter />
      </div>
    </div>
  );
}

/* ----------------------------- backdrop ----------------------------- */

function LandingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#dbeafe,transparent_70%)]" />
      <div className="absolute right-[-200px] top-[80px] h-[440px] w-[440px] rounded-full bg-[radial-gradient(closest-side,#ede9fe,transparent_70%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="landing-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#landing-grid)" />
      </svg>
    </div>
  );
}

/* ----------------------------- header ----------------------------- */

function LandingHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          GrantOS
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Arbitrum Sepolia</span>
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.5rem] sm:leading-[1.05]">
          Milestone-based funding,
          <br />
          <span className="font-serif italic">enforced onchain.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          USDC escrows on Arbitrum. Funds release when ZK proofs verify — not
          committee opinion. Connect your wallet in the header to choose your
          role, or explore below without signing in.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 lg:w-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
            Protocol on Arbitrum Sepolia
          </div>
          <p className="mt-1.5 text-slate-500">
            Browse grants without a wallet. Signing is only required to act.
          </p>
        </div>
        <LiveEscrowPreview />
      </div>
    </div>
  );
}

function LiveEscrowPreview() {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Live escrow
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-700">
          <span className="h-1 w-1 rounded-full bg-sky-600" aria-hidden />
          Active
        </span>
      </header>
      <div className="grid grid-cols-3 divide-x divide-slate-100 text-[10px]">
        <PreviewCell label="Grant" value="GRT-8692" mono />
        <PreviewCell label="Locked" value="$50K" mono />
        <PreviewCell label="Mode" value="Stream" />
      </div>
      <div className="divide-y divide-slate-100 px-3 py-1">
        <PreviewRow label="ZK circuit verified" status="done" />
        <PreviewRow label="Committee quorum" status="pending" />
      </div>
    </article>
  );
}

function PreviewCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-2 py-2">
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-semibold text-slate-900 ${mono ? 'font-mono text-[10px]' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function PreviewRow({
  label,
  status,
}: {
  label: string;
  status: 'done' | 'pending';
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[10px]">
      <span className="font-medium text-slate-700">{label}</span>
      <span
        className={
          status === 'done'
            ? 'font-bold uppercase tracking-wide text-sky-700'
            : 'font-bold uppercase tracking-wide text-slate-400'
        }
      >
        {status === 'done' ? 'Verified' : 'Pending'}
      </span>
    </div>
  );
}

/* ------------------------- entry path cards ------------------------- */

function EntryPathCards() {
  return (
    <section className="mt-10" aria-label="Get started paths">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        Start here
      </p>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <PathTile
          tone="sky"
          eyebrow="Explorer"
          title="Explore grants"
          description="Read-only view of public grants, milestones, escrow status, and onchain proofs — no wallet required."
          features={[
            { icon: <Eye className="h-3.5 w-3.5" />, label: 'Public grant explorer' },
            { icon: <CircleDollarSign className="h-3.5 w-3.5" />, label: 'Live escrow balances' },
            { icon: <GitBranch className="h-3.5 w-3.5" />, label: 'Milestone history' },
          ]}
          ctaLabel="Open Explorer"
          href="/grants"
          icon={<Compass className="h-5 w-5" strokeWidth={2.2} />}
        />
        <PathTile
          tone="indigo"
          eyebrow="Identity"
          title="Verify as a builder"
          description="Generate a ZK proof of contribution and register your identity before receiving milestone payouts."
          features={[
            { icon: <BadgeCheck className="h-3.5 w-3.5" />, label: 'ZK-verified badge' },
            { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Onchain attestation' },
            { icon: <GitBranch className="h-3.5 w-3.5" />, label: 'GitHub-linked proofs' },
          ]}
          ctaLabel="Start verification"
          href="/verify"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={2.2} />}
        />
        <PathTile
          tone="violet"
          eyebrow="Next step"
          title="Connect your wallet"
          description="After connecting, choose Builder, Committee, or Grantor — the same flow you will see on every return visit."
          features={[
            { icon: <Users className="h-3.5 w-3.5" />, label: 'Role-based dashboards' },
            { icon: <Vote className="h-3.5 w-3.5" />, label: 'Committee voting' },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Deploy new grants' },
          ]}
          ctaLabel="Use header to connect"
          href="/"
          icon={<Sparkles className="h-5 w-5" strokeWidth={2.2} />}
          ctaScroll
        />
      </div>
    </section>
  );
}

function PathTile({
  tone,
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  href,
  icon,
  ctaScroll,
}: {
  tone: RoleTone;
  eyebrow: string;
  title: string;
  description: string;
  features: { icon: React.ReactNode; label: string }[];
  ctaLabel: string;
  href: string;
  icon: React.ReactNode;
  ctaScroll?: boolean;
}) {
  const t = TONE[tone];
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-22px_rgba(15,23,42,0.18)] sm:p-7 ${t.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-linear-to-br ${t.halo} opacity-0 transition group-hover:opacity-100`}
      />
      <div className="relative flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${t.iconBg}`}
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

      <p className="relative mt-4 text-sm leading-6 text-slate-600">{description}</p>

      <ul className="relative mt-5 space-y-2">
        {features.map((f) => (
          <li
            key={f.label}
            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${t.chip}`}
            >
              {f.icon}
            </span>
            {f.label}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto pt-8">
        {ctaScroll ? (
          <p
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm ${t.button}`}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </p>
        ) : (
          <Link
            href={href}
            className={`inline-flex h-12 w-full items-center justify-between gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition ${t.button}`}
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

/* --------------------------- protocol metrics --------------------------- */

function ProtocolMetrics() {
  const stats = [
    { value: '$4.2M', label: 'USDC in escrow' },
    { value: '186', label: 'Active grants' },
    { value: '8,944', label: 'Proofs verified' },
    { value: '$48.1K', label: 'Recovered via slash' },
  ];

  return (
    <section className="mt-10" aria-label="Protocol metrics">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Protocol metrics
          </p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-4 md:divide-y-0">
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-5">
              <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {s.label}
              </dt>
              <dd className="mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ----------------------------- primitives ----------------------------- */

function PrimitivesSection() {
  return (
    <section className="mt-10" aria-label="Protocol primitives">
      <SectionIntro
        kicker="Primitives"
        title="Three guarantees, enforced by contract."
        description="GrantEscrow encodes the rules — not a policy doc, not a committee vote in a spreadsheet."
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <PrimitiveTile
          tone="indigo"
          title="Verifiable proof"
          description="Builders submit ZK proofs. Committees verify math, not screenshots."
          features={[
            'Noir coprocessor on Arbitrum',
            'EAS attestations',
            'Public proof hashes',
          ]}
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={2.2} />}
        />
        <PrimitiveTile
          tone="sky"
          title="Conditional release"
          description="USDC unlocks when milestones verify. Lump-sum or Superfluid streams."
          features={[
            'USDC escrow',
            'Per-second streaming',
            'Onchain release events',
          ]}
          icon={<CircleDollarSign className="h-5 w-5" strokeWidth={2.2} />}
        />
        <PrimitiveTile
          tone="violet"
          title="Recoverable on failure"
          description="Warnings on-chain, 24h cool-off, then slash back to treasury."
          features={[
            '24h warning period',
            'Slash to treasury',
            'Permanent audit trail',
          ]}
          icon={<Scale className="h-5 w-5" strokeWidth={2.2} />}
        />
      </div>
    </section>
  );
}

function PrimitiveTile({
  tone,
  title,
  description,
  features,
  icon,
}: {
  tone: RoleTone;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm ${t.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-linear-to-br ${t.halo}`}
      />
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${t.iconBg}`}
      >
        {icon}
      </span>
      <h3 className="relative mt-4 text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ul className="relative mt-4 space-y-1.5">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 font-mono text-[11px] text-slate-600"
          >
            <span className={`h-1 w-1 rounded-full ${t.iconBg}`} aria-hidden />
            {f}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ----------------------------- lifecycle ----------------------------- */

function LifecycleSection() {
  const steps = [
    { n: '01', title: 'Create grant', body: 'Escrow USDC on submission.' },
    { n: '02', title: 'Submit proof', body: 'ZK proof of completed work.' },
    { n: '03', title: 'Verify onchain', body: 'Committee quorum via EAS.' },
    { n: '04', title: 'Funds release', body: 'USDC unlocks or streams.' },
  ];

  return (
    <section className="mt-10" aria-label="Grant lifecycle">
      <SectionIntro
        kicker="Lifecycle"
        title="Four steps. Every one signed."
        description="Each transition is attested — replayable on Arbitrum forever."
      />
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="font-mono text-xs font-bold text-slate-400">{s.n}</span>
            <h3 className="mt-2 text-sm font-bold text-slate-900">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ----------------------------- connect CTA ----------------------------- */

function ConnectCta() {
  return (
    <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_minmax(0,300px)]" aria-label="Connect">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-linear-to-br from-violet-100 via-white to-white"
        />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Ready to participate
        </p>
        <h2 className="relative mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Connect once.{' '}
          <span className="font-serif italic">Same flow every time.</span>
        </h2>
        <p className="relative mt-3 max-w-xl text-sm leading-7 text-slate-600">
          After you connect, you will land on role selection — Builder, Committee,
          or Grantor — matching the screen you see on every return visit.
        </p>
        <ul className="relative mt-5 space-y-2">
          {[
            'Funds escrow on Arbitrum Sepolia — no off-chain custody.',
            '24h on-chain warning before any slash.',
            'Every action attested to EAS.',
            'Committee identities are ZK-verified.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" strokeWidth={2.4} />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Lock className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Wallet required
            </p>
            <p className="mt-1 text-base font-bold text-slate-900">Use Connect Wallet</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Top right of this page — same placement as after you sign in.
        </p>
        <Link
          href="/grants"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950"
        >
          Or continue browsing
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------- footer ----------------------------- */

function LandingFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200/80 pt-8">
      <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        <span>© {new Date().getFullYear()} GrantOS Protocol</span>
        <span className="text-slate-300">·</span>
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
    </footer>
  );
}

function SectionIntro({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {kicker}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}
