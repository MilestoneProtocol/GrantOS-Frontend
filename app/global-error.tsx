'use client';

import { isWalletExtensionNoise } from '@/lib/wallet-extension-errors';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const walletNoise = isWalletExtensionNoise(error);

  useEffect(() => {
    if (walletNoise) reset();
  }, [walletNoise, reset]);

  if (walletNoise) {
    return null;
  }

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center font-sans text-slate-900">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
