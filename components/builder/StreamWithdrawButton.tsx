'use client';

// components/builder/StreamWithdrawButton.tsx
//
// Stellar-only: lets a grantee pull the vested portion of a streaming milestone
// from the Soroban escrow (our linear-streaming replacement for Sablier). Renders
// nothing on EVM grants (where streaming is handled by Sablier off-app).

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Coins } from 'lucide-react';
import { useWallet } from '@/lib/wallet/WalletProvider';
import { getFreighterAddress } from '@/lib/stellar/freighter';
import { getStream, withdrawStream } from '@/lib/stellar/grant';

function fmt(units: bigint): string {
  return units.toString();
}

export default function StreamWithdrawButton({
  escrowId,
  milestoneId,
}: {
  escrowId: string;
  milestoneId: number;
}) {
  const { chainKind, address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<bigint | null>(null);
  const [stream, setStream] = useState<{ total: bigint; withdrawn: bigint } | null>(null);

  const refresh = useCallback(async () => {
    if (chainKind !== 'stellar' || !escrowId) return;
    try {
      const s = await getStream(escrowId, milestoneId);
      if (s) setStream({ total: s.total, withdrawn: s.withdrawn });
    } catch {
      /* not a streaming milestone, or no stream yet */
    }
  }, [chainKind, escrowId, milestoneId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onWithdraw = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const caller = address ?? (await getFreighterAddress());
      if (!caller) throw new Error('Connect Freighter to withdraw.');
      const amount = await withdrawStream({ escrowId, caller, milestoneId });
      setClaimed(amount);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [address, escrowId, milestoneId, refresh]);

  // Only relevant for Stellar grants with a stream on this milestone.
  if (chainKind !== 'stellar' || !stream) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onWithdraw}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
        Withdraw vested
      </button>
      <p className="text-xs text-slate-500">
        Streamed: {fmt(stream.withdrawn)} / {fmt(stream.total)} USDC
        {claimed !== null ? ` · just claimed ${fmt(claimed)}` : ''}
      </p>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
