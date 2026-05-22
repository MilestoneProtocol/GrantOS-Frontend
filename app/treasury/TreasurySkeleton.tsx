/**
 * Full-page skeleton for `/treasury` while DAO admin role validates.
 * Mirrors the rough silhouette of FinancialOverviewBar + the chart row +
 * the breakdown / activity row so the layout stays steady on auth resolve.
 */
export default function TreasurySkeleton() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded-md bg-slate-200" aria-hidden />
            <div className="h-3 w-72 animate-pulse rounded-md bg-slate-100" aria-hidden />
          </div>
          <div className="h-8 w-56 animate-pulse rounded-full bg-slate-100" aria-hidden />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[112px] animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
              aria-hidden
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
