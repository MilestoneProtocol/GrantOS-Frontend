'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function BuilderProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[builder profile]', error);
  }, [error]);

  const walletNoise =
    error.message.includes('chrome.runtime.sendMessage') ||
    error.message.includes('Extension ID');

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-xl font-bold text-slate-900">Could not load builder profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        {walletNoise
          ? 'A browser wallet extension interfered with this page. Try disabling other wallet extensions, using a private window, or refreshing.'
          : 'Something went wrong while loading this profile.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Try again
        </button>
        <Link
          href="/grants"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          Back to explorer
        </Link>
      </div>
    </main>
  );
}
