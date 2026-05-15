'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Voting flow used by `ReviewPanel`. Production wires this to `writeContract`
 * + `useWatchContractEvent('VoteCast')`; the demo simulator below times out the
 * `confirming` and `submitted` phases so the UI is fully exercisable without a
 * live contract.
 */

export type VoteIntent = 'approve' | 'reject';

export type VoteFlowState =
  | { kind: 'idle' }
  | { kind: 'confirming'; intent: VoteIntent }
  | { kind: 'submitted'; intent: VoteIntent; txHash: string }
  | { kind: 'voted'; intent: VoteIntent; txHash?: string };

type VoteFlow = {
  state: VoteFlowState;
  /** Fire on Approve / Reject button click. */
  start: (intent: VoteIntent) => void;
  /** Reset to idle. Useful for "Undo" or error retries. */
  reset: () => void;
};

const CONFIRMING_DELAY_MS = 1700;
const SUBMITTED_DELAY_MS = 1800;

/** Generates a stable-looking 0x… hex string for the demo Arbiscan link. */
function fakeTxHash(): string {
  const chars = 'abcdef0123456789';
  let out = '0x';
  for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Local-only vote FSM. Drives the overlay copy + button replacement without
 * touching the wallet. Swap `start` for a wagmi `writeContract` call when the
 * contract is wired in.
 */
export function useDemoVoteFlow(initial?: VoteFlowState): VoteFlow {
  const [state, setState] = useState<VoteFlowState>(initial ?? { kind: 'idle' });
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const start = useCallback((intent: VoteIntent) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setState({ kind: 'confirming', intent });

    const txHash = fakeTxHash();
    timersRef.current.push(
      setTimeout(() => {
        setState({ kind: 'submitted', intent, txHash });

        timersRef.current.push(
          setTimeout(() => {
            setState({ kind: 'voted', intent, txHash });
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
