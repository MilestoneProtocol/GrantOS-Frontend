import type { GrantDetail, GrantTagTone } from '@/demo/committee-demo';

type GrantHeaderCardProps = {
  grant: GrantDetail;
};

function formatUsd(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function tagToneClass(tone: GrantTagTone) {
  switch (tone) {
    case 'defi':
      return 'bg-blue-100 text-blue-700';
    case 'infra':
      return 'bg-violet-100 text-violet-700';
    case 'social':
      return 'bg-pink-100 text-pink-700';
    case 'public_good':
      return 'bg-emerald-100 text-emerald-700';
    case 'other':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

/**
 * Top hero card for the grant detail page. Mirrors the design shot: category +
 * lifecycle tag pills, grant title, short description, and a right-aligned
 * "Total Grant Allocation" with the USDC figure.
 */
export default function GrantHeaderCard({ grant }: GrantHeaderCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${tagToneClass(
                grant.tagTone,
              )}`}
            >
              {grant.tag}
            </span>
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
              {grant.lifecycleLabel}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
            {grant.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{grant.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">
            Total Grant Allocation
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            ${formatUsd(grant.totalAllocationUsdc)}{' '}
            <span className="text-base text-slate-500">USDC</span>
          </p>
        </div>
      </div>
    </section>
  );
}
