'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-200">
          <span className="text-2xl">✕</span>
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-slate-900">Verification Failed</h2>
        <p className="mt-3 text-sm text-slate-500">
          Something went wrong during the GitHub verification process.
          {requestId && <span className="block mt-1 text-xs text-slate-400">Request: {requestId}</span>}
        </p>
        <button
          onClick={() => router.push('/verify/identity-verification')}
          className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function VerifyFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  );
}
