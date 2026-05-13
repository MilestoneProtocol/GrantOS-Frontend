/**
 * Full-page skeleton for the Committee Review dashboard. Rendered while the
 * route validates committee membership and before any real data lands, so the
 * shell never flashes empty content (or worse, the dashboard layout).
 *
 * Layout mirrors what will replace it: page title, four stat cards, filter row,
 * column headers, and a stack of milestone rows.
 */
export default function CommitteeReviewSkeleton() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2.5">
          <div className="h-3.5 w-72 max-w-full animate-pulse rounded-md bg-slate-200" aria-hidden />
          <div className="h-2.5 w-1/2 max-w-md animate-pulse rounded-md bg-slate-200" aria-hidden />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              aria-hidden
            >
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-2.5 h-2 w-3/4 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-slate-200" />
              <div className="h-7 w-24 animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="h-7 w-56 max-w-full animate-pulse rounded-md bg-slate-100" />
          </div>

          <div className="mt-5 hidden grid-cols-12 gap-3 border-b border-slate-100 pb-3 sm:grid">
            <div className="col-span-5 h-2 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-2 animate-pulse rounded bg-slate-200" />
            <div className="col-span-3 h-2 animate-pulse rounded bg-slate-200" />
            <div className="col-span-2 h-2 animate-pulse rounded bg-slate-200" />
          </div>

          <ul className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-12 items-center gap-3 rounded-lg border border-slate-100 px-3 py-3"
                aria-hidden
              >
                <div className="col-span-12 h-3 animate-pulse rounded bg-slate-200 sm:col-span-5" />
                <div className="col-span-6 h-2.5 animate-pulse rounded bg-slate-100 sm:col-span-2" />
                <div className="col-span-6 h-3 animate-pulse rounded bg-slate-200 sm:col-span-3" />
                <div className="col-span-12 h-6 animate-pulse rounded-full bg-slate-100 sm:col-span-2" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        Verifying committee membership…
      </span>
    </div>
  );
}
