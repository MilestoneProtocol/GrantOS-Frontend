'use client';

import { useEffect, useRef } from 'react';
import { useReconnect } from 'wagmi';

/**
 * Delays auto-reconnect until after hydration. Two reasons:
 *   1. Competing wallet extensions throw `chrome.runtime.sendMessage` errors
 *      if we try to talk to them during the first paint.
 *   2. On Chrome with multiple wallets installed, the previously-stored
 *      connector's `findProvider` lookup can fail (`Provider not found`)
 *      because another wallet has hijacked `window.ethereum`. Silently
 *      swallowing the rejection means the user just sees the modal with no
 *      red banner, then picks a wallet themselves.
 */
export default function WagmiReconnectAfterMount() {
  const { reconnect } = useReconnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const id = window.setTimeout(() => {
      try {
        // useReconnect's mutate returns void but its underlying promise
        // rejects on failure; catch it to keep the page clean.
        const result = reconnect() as unknown;
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch(() => {});
        }
      } catch {
        /* extension conflicts are non-fatal; WalletExtensionErrorHandler logs in dev */
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [reconnect]);

  return null;
}
