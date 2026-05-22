'use client';

import { buildArbiscanTxUrl, type SlashFlowState, type SlashFlowParams } from '@/lib/slash-flow';
import {
  AlertOctagon,
  Building2,
  CheckCircle2,
  Coins,
  ExternalLink,
  Loader2,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { useEffect } from 'react';

type SlashConfirmationDialogProps = {
  open: boolean;
  /** Display amount + label, e.g. "25,000 USDC". Surfaced in the first bullet. */
  amountLabel: string;
  flowState: SlashFlowState;
  onCancel: () => void;
  onConfirm: (params?: SlashFlowParams) => void;
  /** Production mode parameters */
  slashParams?: SlashFlowParams;
};

/**
 * Destructive confirmation modal for the slash transaction (US-04 step 4).
 *
 * The modal layers over the entire page (not just the panel) so the user is
 * forced to make an explicit accept/reject decision. We deliberately spell
 * out the three on-chain consequences as bullet points — escrow → treasury,
 * milestone permanently closed, builder reputation penalised — so it's
 * impossible to misinterpret the click.
 *
 * The same dialog also hosts the in-flight transaction states:
 *  - `confirming` → spinner + "Awaiting wallet signature…"
 *  - `submitted`  → spinner + Arbiscan tx link
 *  - `confirmed`  → the host page collapses the panel; we close the modal.
 *
 * Cancel is blocked while a tx is in flight to prevent confusing the user
 * about whether their signature went through.
 */
export default function SlashConfirmationDialog({
  open,
  amountLabel,
  flowState,
  onCancel,
  onConfirm,
  slashParams,
}: SlashConfirmationDialogProps) {
  const txInFlight = flowState.kind === 'confirming' || flowState.kind === 'submitted';

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !txInFlight) onCancel();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, txInFlight, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slash-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cancel slash confirmation"
        disabled={txInFlight}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-slate-900/55 backdrop-blur-[3px]"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.32)]">
        <div className="h-1 w-full bg-linear-to-r from-red-600 via-red-500 to-orange-500" />

        <div className="px-6 pt-6">
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 ring-4 ring-red-50"
              aria-hidden
            >
              <AlertOctagon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="slash-confirm-title"
                className="text-lg font-bold text-slate-900"
              >
                This action is irreversible
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Confirming will broadcast the slash transaction to{' '}
                <span className="font-mono text-slate-700">GrantEscrow.slash</span>. Once
                mined, the milestone is permanently closed onchain.
              </p>
            </div>
            {!txInFlight ? (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <ul className="mt-5 space-y-3">
            <ConsequenceItem icon={<Coins className="h-3.5 w-3.5" strokeWidth={2.2} />}>
              <span className="font-mono font-semibold text-slate-900">{amountLabel}</span>{' '}
              of escrowed USDC will be returned to the treasury.
            </ConsequenceItem>
            <ConsequenceItem
              icon={<Building2 className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              The milestone will be permanently closed and cannot be submitted or
              approved afterward.
            </ConsequenceItem>
            <ConsequenceItem
              icon={<TrendingDown className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              The builder&apos;s onchain reputation score will be penalised (warning +
              slash penalty).
            </ConsequenceItem>
          </ul>
        </div>

        <Footer flowState={flowState} onCancel={onCancel} onConfirm={onConfirm} />
      </div>
    </div>
  );
}

/* ---------------------------- Subcomponents ---------------------------- */

function ConsequenceItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
        aria-hidden
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Footer({
  flowState,
  onCancel,
  onConfirm,
}: {
  flowState: SlashFlowState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (flowState.kind === 'confirming') {
    return (
      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Awaiting wallet signature&hellip;
        </span>
      </div>
    );
  }

  if (flowState.kind === 'submitted') {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        <a
          href={buildArbiscanTxUrl(flowState.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Slash Submitted
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    );
  }

  if (flowState.kind === 'confirmed') {
    return (
      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          Slash Confirmed Onchain
        </span>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-300"
      >
        <Zap className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        Confirm Slash
      </button>
    </div>
  );
}
