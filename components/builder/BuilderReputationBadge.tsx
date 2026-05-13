'use client';

import { useBuilderReputationScore } from '@/lib/builder-warnings';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * Persistent reputation pill rendered in the builder header, as required
 * by US-04 step 3:
 *
 *   "After slash confirms, the builder's reputation score in the
 *    persistent header decrements visibly — −5 for warning, −15 for
 *    slash — with a brief red flash animation."
 *
 * Implementation
 * --------------
 * - Score is computed live from the cross-route warning store
 *   (`useBuilderReputationScore`). It re-renders whenever the committee
 *   page mutates the store, so the flash naturally lines up with the
 *   slash tx confirmation.
 * - We capture the previous score in a `useRef` and trigger a 1.4s red
 *   flash (`data-flash` attribute) on any decrease. The keyframes live
 *   in `globals.css` under `@keyframes grantos-rep-flash`.
 * - Client-only (`useEffect` for mount gate) — the score is sourced from
 *   `localStorage`, so SSR would mismatch.
 */
export default function BuilderReputationBadge() {
  const { address } = useAccount();
  const { score, baseScore } = useBuilderReputationScore(address);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Flash on any decrease in the score (warning or slash). We treat the
  // first render after mount as a "baseline" — no flash, since the user
  // may simply have navigated here long after the deduction landed.
  const prevRef = useRef<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (!mounted) return;
    const prev = prevRef.current;
    prevRef.current = score;
    if (prev === null) return;
    if (score >= prev) return;
    setFlashing(true);
    const t = window.setTimeout(() => setFlashing(false), 1400);
    return () => window.clearTimeout(t);
  }, [mounted, score]);

  if (!mounted) {
    // SSR placeholder: same dimensions, no live score yet. Keeps the
    // header layout stable through hydration.
    return (
      <div
        aria-hidden
        className="hidden h-9 w-[122px] shrink-0 rounded-full border border-slate-200 bg-white shadow-sm sm:inline-flex"
      />
    );
  }

  const isLow = score < baseScore;

  return (
    <div
      data-flash={flashing ? 'true' : undefined}
      role="status"
      aria-live="polite"
      aria-label={`Reputation ${score} out of ${baseScore}`}
      className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors sm:inline-flex ${
        isLow
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-white text-slate-700'
      } data-[flash=true]:animate-[grantos-rep-flash_1.4s_ease-out]`}
    >
      <Star
        className={`h-3.5 w-3.5 ${
          isLow ? 'text-amber-500' : 'text-yellow-400'
        }`}
        fill="currentColor"
        strokeWidth={1.5}
        aria-hidden
      />
      <span>
        Reputation:{' '}
        <span className="font-bold text-slate-900">{score}</span>
        <span className="text-slate-400"> / {baseScore}</span>
      </span>
    </div>
  );
}
