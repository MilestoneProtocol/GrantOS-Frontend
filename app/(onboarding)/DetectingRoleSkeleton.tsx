'use client';

import { Loader2 } from 'lucide-react';

export default function DetectingRoleSkeleton() {
  return (
    <div className="flex w-full flex-1 items-center justify-center px-4 py-14 sm:px-6 lg:px-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
          Detecting your role...
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We’re checking your onchain history on Arbitrum Sepolia. This takes a moment.
        </p>

        <div className="mt-6 space-y-3">
          <div className="h-12 w-full rounded-2xl bg-slate-100" />
          <div className="h-12 w-full rounded-2xl bg-slate-100" />
          <div className="h-12 w-full rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

