'use client';

import { useEffect, useRef } from 'react';
import { useReconnect } from 'wagmi';

/**
 * Delays auto-reconnect until after hydration so competing wallet extensions
 * do not throw chrome.runtime.sendMessage during the first paint.
 */
export default function WagmiReconnectAfterMount() {
  const { reconnect } = useReconnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const id = window.setTimeout(() => {
      try {
        reconnect();
      } catch {
        /* extension conflicts are non-fatal; WalletExtensionErrorHandler logs in dev */
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [reconnect]);

  return null;
}
