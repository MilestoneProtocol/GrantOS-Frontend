'use client';

import type { OverdueMilestoneState } from '@/demo/committee-demo';
import { AlertCircle, ExternalLink, Zap } from 'lucide-react';

type SlashReadyPanelProps = {
  /**
   * The warning state that has just elapsed (`Date.now() >= slashUnlocksAtIso`).
   * Also accepts the explicit `slash_available` substate for fixtures that
   * skip straight to the slash-ready visual.
   */
  state:
    | Extract<OverdueMilestoneState, { kind: 'warning_issued' }>
    | Extract<OverdueMilestoneState, { kind: 'slash_available' }>;
  /** Fired when the committee member clicks `Execute Slash Now`. */
  onExecute: () => void;
};

/**
 * Single-panel state shown the instant the 24h warning cool-off elapses.
 *
 * `setInterval`-driven re-renders inside `MilestoneWarningView` swap the
 * `EnforcementActionPanel` for this component the moment `Date.now()`
 * crosses `slashUnlocksAtIso` — no route change, no manual refresh.
 *
 * Visually distinct from the waiting state: red clock, centered layout,
 * a digital `00 : 00 : 00` timer (the contract gate is now open), and a
 * solid red `Execute Slash Now` button. Clicking the button raises the
 * confirmation modal — the destructive transaction is never one-click.
 */
export default function SlashReadyPanel({ state, onExecute }: SlashReadyPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 w-full bg-linear-to-r from-red-500 via-red-600 to-red-500" />

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6">
        <p className="text-sm font-bold text-slate-900">Slash Authorization</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          Warning Active
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 px-5 py-10 text-center sm:px-6 sm:py-12">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50"
          aria-hidden
        >
          <AlertCircle className="h-7 w-7" strokeWidth={2} />
        </span>

        <div className="max-w-md">
          <h2 className="text-lg font-bold text-slate-900">Slash Window Open</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            The 24-hour warning period has concluded. The slash transaction is now
            authorised on chain &mdash; confirm to execute and return funds to the
            treasury.
          </p>
        </div>

        <DigitalCountdownDisplay />

        <button
          type="button"
          onClick={onExecute}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-300"
        >
          <Zap className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          Execute Slash Now
        </button>

        <a
          href={getAttestationUrl(state)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 transition hover:text-blue-700"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          View underlying warning attestation
        </a>
      </div>
    </section>
  );
}

/* ------------------------------ Internals ------------------------------ */

function DigitalCountdownDisplay() {
  // The 24-hour gate has elapsed — the contract will now accept the slash
  // call. We render the static `00 : 00 : 00` "all clear" indicator rather
  // than letting the timer go negative; this matches the design and
  // emphasises that the lockout has fully expired.
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center gap-2 font-mono text-4xl font-bold tabular-nums text-red-600 sm:text-5xl"
        role="timer"
        aria-live="off"
        aria-label="Slash window open: 0 hours, 0 minutes, 0 seconds remaining"
      >
        <span>00</span>
        <span className="text-red-300">:</span>
        <span>00</span>
        <span className="text-red-300">:</span>
        <span>00</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
        Time Remaining
      </p>
    </div>
  );
}

function getAttestationUrl(state: SlashReadyPanelProps['state']): string {
  return state.attestationUrl;
}
