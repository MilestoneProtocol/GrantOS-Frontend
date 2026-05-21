'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import Link from 'next/link';
import { isWalletExtensionNoise } from '@/lib/wallet-extension-errors';
import { useEffect } from 'react';

export default function BuilderDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[builder dashboard]', error);
  }, [error]);

  const walletNoise = isWalletExtensionNoise(error);

  return (
    <BuilderAppShell navActive="dashboard">
      <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-slate-900">Builder dashboard unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          {walletNoise
            ? 'A browser wallet extension blocked this page. Disable extra wallet extensions, keep one provider (e.g. MetaMask), or open GrantOS in a private window.'
            : 'Something went wrong while loading your dashboard.'}
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
            href="/?select=1"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            Role selection
          </Link>
        </div>
      </main>
    </BuilderAppShell>
  );
}
