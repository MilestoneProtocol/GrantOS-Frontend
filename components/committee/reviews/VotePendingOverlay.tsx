import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';

export type VotePendingOverlayProps = {
  /**
   * `confirming` — waiting for the wallet signature.
   * `submitted`  — transaction was sent; we have a tx hash to link to.
   */
  state: 'confirming' | 'submitted';
  intent: 'approve' | 'reject';
  /** Only used in the `submitted` state; renders the Arbiscan link target. */
  txHash?: string;
  /**
   * Explorer URL builder. Defaults to Arbiscan mainnet. Override per-deployment
   * (e.g. Sepolia) by passing a custom builder.
   */
  buildExplorerUrl?: (txHash: string) => string;
};

function defaultExplorerUrl(txHash: string) {
  return `https://arbiscan.io/tx/${txHash}`;
}

/**
 * Glass-panel modal pinned over a `ReviewPanel` during the vote-pending phase.
 *
 * The host panel is responsible for sizing — this component just absolutely
 * positions itself, dims the parent with a frosted backdrop, and renders the
 * appropriate copy for `confirming` or `submitted`.
 */
export default function VotePendingOverlay({
  state,
  intent,
  txHash,
  buildExplorerUrl = defaultExplorerUrl,
}: VotePendingOverlayProps) {
  const intentLabel = intent === 'approve' ? 'approval' : 'rejection';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[3px]"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-7 text-center shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
        {state === 'confirming' ? (
          <>
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-100"
              aria-hidden
            >
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </span>
            <p className="mt-4 text-base font-bold text-slate-900">Confirm in your wallet</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Waiting for signature on your {intentLabel} vote…
            </p>
          </>
        ) : (
          <>
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              aria-hidden
            >
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <p className="mt-4 text-base font-bold text-slate-900">Transaction submitted</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Your {intentLabel} is being recorded onchain. The tally below will
              update once the transaction confirms.
            </p>
            {txHash ? (
              <a
                href={buildExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                View on Arbiscan
              </a>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
