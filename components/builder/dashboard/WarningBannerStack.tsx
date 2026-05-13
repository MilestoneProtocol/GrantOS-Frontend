'use client';

import { useBuilderWarnings } from '@/lib/builder-warnings';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import WarningBanner from './WarningBanner';

/**
 * Pulls every active warning targeting the connected builder wallet and
 * renders them as a stack of non-dismissable banners at the top of the
 * builder dashboard. Renders nothing when there are no active warnings, so
 * the dashboard stays clean in the common case.
 *
 * Source of truth is the cross-route `useBuilderWarnings` store — committee
 * mutations (issue warning / execute slash) flow into this list via
 * localStorage, so navigating from `/committee → /dashboard` immediately
 * reflects the new warning without any wallet round-trip.
 *
 * Render strategy: this stack is strictly client-only. Two inputs make
 * server-rendering unsafe — (a) the live `Date.now()`-driven countdown text
 * inside each `WarningBanner`, and (b) seed warning timestamps that are
 * captured at module-load time (so the server's "23h 26m" disagrees with
 * the client's "23h 30m" by the time hydration runs). Gating with a
 * `mounted` flag eliminates the SSR/CSR mismatch outright, and — critically
 * — lets `useBuilderWarnings` initialise its `active` slice from
 * `localStorage` without an intervening rehydration step that was eating
 * freshly-saved warnings before the React tree settled.
 */
export default function WarningBannerStack() {
  const { address } = useAccount();
  const warnings = useBuilderWarnings(address);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (warnings.length === 0) return null;

  return (
    <section
      aria-label="Active milestone warnings"
      className="flex flex-col gap-3"
    >
      {warnings.map((warning) => (
        <WarningBanner key={warning.id} warning={warning} />
      ))}
    </section>
  );
}
