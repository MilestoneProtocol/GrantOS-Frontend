/**
 * Full-page skeleton for `/dao` while DAO admin role validates.
 */
export default function DaoDashboardSkeleton() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-slate-200" aria-hidden />
            <div className="h-3 w-96 max-w-full animate-pulse rounded-md bg-slate-100" aria-hidden />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" aria-hidden />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              aria-hidden
            >
              <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white"
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
