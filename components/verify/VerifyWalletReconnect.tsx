'use client';

import { useEffect, useRef } from 'react';
import { useReconnect } from 'wagmi';

/** Eager reconnect on verification routes so OAuth return keeps the same wallet session. */
export default function VerifyWalletReconnect() {
  const { reconnect } = useReconnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    try {
      void reconnect();
    } catch {
      /* non-fatal */
    }
  }, [reconnect]);

  return null;
}
