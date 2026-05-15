'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Submission FSM for `GrantEscrow.slash(grantId, milestoneIndex)` — the
 * terminal step of the due-process flow (US-04).
 *
 * Production transitions:
 *   1. `confirming` — wallet is signing the slash tx. `GrantEscrow` will
 *                     verify on-chain that a `MilestoneWarning` attestation
 *                     older than 24h exists for this `(grantId, index)`.
 *   2. `submitted`  — broadcast succeeded; we have a tx hash. UI awaits one
 *                     confirmation.
 *   3. `confirmed`  — tx mined. The `Slashed` event carries the timestamp
 *                     and amount returned to the treasury; the UI swaps the
 *                     action panel for the permanent `SlashedBadge`.
 *
 * Demo mode (`NEXT_PUBLIC_GRANTOS_UI_DEMO=true`) runs the same timeline on
 * synthetic timers so the confirmation modal and the post-slash collapse
 * can be exercised without a wallet or chain.
 */

export type SlashFlowState =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'submitted'; txHash: string }
  | { kind: 'confirmed'; txHash: string; slashedAtIso: string };

export type SlashFlow = {
  state: SlashFlowState;
  /** Fired when the user clicks `Confirm Slash` in the modal. */
  start: () => void;
  /** Reset to idle. Used by the Cancel button and on dialog dismissal. */
  reset: () => void;
};

const CONFIRMING_DELAY_MS = 1600;
const SUBMITTED_DELAY_MS = 2000;

function randomHex(length: number): string {
  const chars = 'abcdef0123456789';
  let out = '0x';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Demo-only slash FSM. Swap `start` for a wagmi `writeContract({
 * functionName: 'slash', args: [grantId, milestoneIndex] })` call once the
 * contract bindings land — the rest of the UI consumes the same state
 * shape.
 */
export function useDemoSlashFlow(initial?: SlashFlowState): SlashFlow {
  const [state, setState] = useState<SlashFlowState>(initial ?? { kind: 'idle' });
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const start = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setState({ kind: 'confirming' });

    const txHash = randomHex(64);

    timersRef.current.push(
      setTimeout(() => {
        setState({ kind: 'submitted', txHash });

        timersRef.current.push(
          setTimeout(() => {
            setState({
              kind: 'confirmed',
              txHash,
              slashedAtIso: new Date().toISOString(),
            });
          }, SUBMITTED_DELAY_MS),
        );
      }, CONFIRMING_DELAY_MS),
    );
  }, []);

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setState({ kind: 'idle' });
  }, []);

  return useMemo(() => ({ state, start, reset }), [state, start, reset]);
}

/** Default Arbiscan tx URL builder. */
export function buildArbiscanTxUrl(txHash: string): string {
  return `https://arbiscan.io/tx/${txHash}`;
}
