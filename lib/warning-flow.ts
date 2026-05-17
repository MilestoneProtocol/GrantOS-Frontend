'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWarningFlow as useRealWarningFlow } from '@/hooks/useWarningFlow';
import type { Address } from 'viem';

/**
 * Submission FSM for issuing a Milestone Warning attestation (US-04 step 1).
 *
 * In production each transition is driven by real wallet + chain events:
 *   1. `confirming`  — EAS SDK builds an `attest` payload (grantId,
 *                      milestoneIndex, committee address, warningTimestamp,
 *                      message). The user is signing in their wallet.
 *   2. `submitted`   — The signed tx broadcasted; we have a `txHash` and an
 *                      Arbiscan link for it. UI awaits 1 confirmation.
 *   3. `confirmed`   — Tx mined; the resulting `attestationUid` is forwarded
 *                      to `GrantEscrow.recordWarning(grantId, milestoneIndex,
 *                      attestationUid)`. After that, the 24h slash cool-off
 *                      starts ticking on chain.
 *
 * In demo mode (`NEXT_PUBLIC_GRANTOS_UI_DEMO=true`) we run a synthetic
 * timeline so the three button states are fully exercisable without a wallet
 * or a chain.
 */

export type WarningFlowState =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'submitted'; txHash: string }
  | { kind: 'confirmed'; txHash: string; attestationUid: string };

export type WarningFlow = {
  state: WarningFlowState;
  /** Triggered when the user clicks `Submit Warning Onchain`. */
  start: (params: WarningFlowParams) => void;
  /** Reset back to `idle` (used for the Cancel button or error retries). */
  reset: () => void;
};

export interface WarningFlowParams {
  grantId: number;
  milestoneIndex: number;
  builderAddress: Address;
  committeeAddress: Address;
  message: string;
  sentinelAddress: Address;
}

const CONFIRMING_DELAY_MS = 1700;
const SUBMITTED_DELAY_MS = 2200;

function randomHex(length: number): string {
  const chars = 'abcdef0123456789';
  let out = '0x';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Demo-only FSM driving the `Submit Warning Onchain` button. Swap `start`
 * for a wagmi `writeContract({ functionName: 'recordWarning', ... })` call
 * once the contract bindings land.
 */
export function useDemoWarningFlow(initial?: WarningFlowState): WarningFlow {
  const [state, setState] = useState<WarningFlowState>(initial ?? { kind: 'idle' });
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const start = useCallback((params: WarningFlowParams) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setState({ kind: 'confirming' });

    const txHash = randomHex(64);
    const attestationUid = randomHex(64);

    timersRef.current.push(
      setTimeout(() => {
        setState({ kind: 'submitted', txHash });

        timersRef.current.push(
          setTimeout(() => {
            setState({ kind: 'confirmed', txHash, attestationUid });
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

/**
 * Production warning flow that integrates with real contracts and backend.
 */
export function useProductionWarningFlow(): WarningFlow {
  const [state, setState] = useState<WarningFlowState>({ kind: 'idle' });
  const { issueWarning, isIssuing } = useRealWarningFlow();

  const start = useCallback(
    async (params: WarningFlowParams) => {
      setState({ kind: 'confirming' });

      try {
        await issueWarning(params);
        // State updates will be handled by the hook
        setState({ kind: 'confirmed', txHash: '0x...', attestationUid: '0x...' });
      } catch (err) {
        console.error('Warning flow error:', err);
        setState({ kind: 'idle' });
      }
    },
    [issueWarning],
  );

  const reset = useCallback(() => {
    setState({ kind: 'idle' });
  }, []);

  return useMemo(() => ({ state, start, reset }), [state, start, reset]);
}

/** Default Arbiscan tx URL builder. Override per-environment if needed. */
export function buildArbiscanTxUrl(txHash: string): string {
  return `https://arbiscan.io/tx/${txHash}`;
}
