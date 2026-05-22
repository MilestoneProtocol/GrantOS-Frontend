export default function BuilderProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mb-4 h-4 w-48 animate-pulse rounded-md bg-slate-200" />
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="h-8 w-full max-w-xl animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
            <div className="flex gap-3">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-100" />
            </div>
          </div>
          <div className="mx-auto h-28 w-28 shrink-0 animate-pulse rounded-full bg-slate-100 lg:mx-0" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}
