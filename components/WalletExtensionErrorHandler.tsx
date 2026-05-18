'use client';

import { useEffect, type ReactNode } from 'react';

function isWalletExtensionNoise(reason: unknown): boolean {
  const msg =
    typeof reason === 'string'
      ? reason
      : reason instanceof Error
        ? reason.message
        : String(reason ?? '');
  return (
    msg.includes('chrome.runtime.sendMessage') ||
    msg.includes('Extension ID') ||
    msg.includes('inpage.js')
  );
}

/**
 * Prevents competing wallet extensions from surfacing as fatal Next.js overlays.
 * The underlying provider conflict may still exist — user should disable duplicate wallets.
 */
export default function WalletExtensionErrorHandler({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isWalletExtensionNoise(event.reason)) return;
      event.preventDefault();
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[GrantOS] Suppressed wallet extension error. If navigation fails, try one wallet extension or an incognito window.',
          event.reason,
        );
      }
    };

    const onError = (event: ErrorEvent) => {
      if (!isWalletExtensionNoise(event.error ?? event.message)) return;
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return children;
}
