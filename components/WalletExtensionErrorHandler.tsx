'use client';

import { isWalletExtensionNoise } from '@/lib/wallet-extension-errors';
import { useLayoutEffect, type ReactNode } from 'react';

/**
 * Prevents competing wallet extensions from surfacing as fatal Next.js overlays.
 */
export default function WalletExtensionErrorHandler({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isWalletExtensionNoise(event.reason)) return;
      event.preventDefault();
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[GrantOS] Suppressed wallet extension error. If connection fails, use one wallet extension or a private window.',
          event.reason,
        );
      }
    };

    const onError = (event: ErrorEvent) => {
      if (!isWalletExtensionNoise(event.error ?? event.message)) return;
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return children;
}
