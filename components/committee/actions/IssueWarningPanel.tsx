'use client';

import type { OverdueMilestone } from '@/demo/committee-demo';
import {
  buildArbiscanTxUrl,
  useDemoWarningFlow,
  type WarningFlowState,
} from '@/lib/warning-flow';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Send,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type IssueWarningPanelProps = {
  milestone: OverdueMilestone;
  /**
   * Fired when the user clicks the inline "Cancel" link. The page should
   * exit the Warning Issuance screen state and return to the dashboard.
   */
  onCancel: () => void;
  /**
   * Notified once the warning attestation reaches the `confirmed` state.
   * The page is expected to advance the milestone into the
   * `warning_issued` substate so the 24h countdown starts ticking.
   */
  onConfirmed?: (payload: {
    milestoneId: string;
    txHash: string;
    attestationUid: string;
    message: string;
    warningTimestampIso: string;
  }) => void;
};

const MIN_MESSAGE_LENGTH = 50;

/**
 * The "Issue Official Warning" panel that expands inline beneath the
 * overdue milestone when the committee member clicks Issue Warning.
 *
 * The form is the entire UX of this screen state — there's no modal and no
 * route change. The textarea has a live character counter with a 50-char
 * minimum, the message is pre-filled with the milestone's draft (editable),
 * and the submit button transitions through three states driven by the
 * `useDemoWarningFlow` FSM:
 *   `idle`        → red "Submit Warning Onchain" button
 *   `confirming`  → spinner + "Awaiting wallet signature…"
 *   `submitted`   → green "Transaction Submitted" with Arbiscan link
 *   `confirmed`   → green "Warning Confirmed Onchain" + auto-advance via
 *                   `onConfirmed`.
 */
export default function IssueWarningPanel({
  milestone,
  onCancel,
  onConfirmed,
}: IssueWarningPanelProps) {
  const [message, setMessage] = useState(milestone.warningMessageDraft);
  const flow = useDemoWarningFlow();

  const messageLength = message.length;
  const meetsMinimum = messageLength >= MIN_MESSAGE_LENGTH;
  const isLocked = flow.state.kind !== 'idle';
  const submitDisabled = !meetsMinimum || isLocked;

  const handleSubmit = useCallback(() => {
    if (submitDisabled) return;
    flow.start();
  }, [flow, submitDisabled]);

  /**
   * Bubble the `confirmed` payload back to the host page exactly once. We
   * use a ref-style guard inside `useMemo` so a parent re-render mid-flow
   * doesn't double-fire the handler.
   */
  useConfirmedEffect(flow.state, (state) => {
    onConfirmed?.({
      milestoneId: milestone.id,
      txHash: state.txHash,
      attestationUid: state.attestationUid,
      message,
      warningTimestampIso: new Date().toISOString(),
    });
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 w-full bg-linear-to-r from-red-500 via-red-500 to-orange-400" />

      <PanelHeader
        title="Issue Official Warning"
        description="This action will be recorded onchain via EAS and pause the Superfluid stream."
        onCancel={isLocked ? undefined : onCancel}
      />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <WarningMessageField
          value={message}
          onChange={setMessage}
          disabled={isLocked}
          messageLength={messageLength}
          meetsMinimum={meetsMinimum}
        />

        <InfoBanner />

        <PanelFooter
          state={flow.state}
          submitDisabled={submitDisabled}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}

/* ---------------------------- Panel chrome ---------------------------- */

function PanelHeader({
  title,
  description,
  onCancel,
}: {
  title: string;
  description: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}

function WarningMessageField({
  value,
  onChange,
  disabled,
  messageLength,
  meetsMinimum,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  messageLength: number;
  meetsMinimum: boolean;
}) {
  const counterTone = meetsMinimum ? 'text-slate-400' : 'text-red-500';

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="warning-message"
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600"
        >
          Warning Message
        </label>
        <span className={`text-[11px] font-medium tabular-nums ${counterTone}`}>
          {messageLength} / Min {MIN_MESSAGE_LENGTH} chars
        </span>
      </div>
      <textarea
        id="warning-message"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        spellCheck={false}
        aria-invalid={!meetsMinimum}
        className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-hidden transition placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function InfoBanner() {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-2.5">
      <span className="mt-0.5 text-blue-500" aria-hidden>
        <Info className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <p className="text-[12px] leading-relaxed text-slate-600">
        Message will be hashed and stored in the EAS attestation. The raw text will be
        available on the IPFS gateway.
      </p>
    </div>
  );
}

function PanelFooter({
  state,
  submitDisabled,
  onSubmit,
}: {
  state: WarningFlowState;
  submitDisabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-slate-500">
            <Zap className="h-2.5 w-2.5" strokeWidth={2.4} aria-hidden />
          </span>
          EAS SDK
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-blue-500">
            <DropletIcon />
          </span>
          Superfluid Pause
        </span>
      </div>

      <SubmitButton state={state} disabled={submitDisabled} onClick={onSubmit} />
    </div>
  );
}

/* ---------------------------- Submit button ---------------------------- */

function SubmitButton({
  state,
  disabled,
  onClick,
}: {
  state: WarningFlowState;
  disabled: boolean;
  onClick: () => void;
}) {
  if (state.kind === 'confirming') {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Awaiting wallet signature&hellip;
      </span>
    );
  }

  if (state.kind === 'submitted') {
    return (
      <a
        href={buildArbiscanTxUrl(state.txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Transaction Submitted
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }

  if (state.kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} aria-hidden />
        Warning Confirmed Onchain
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={
        disabled
          ? 'inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-red-300 px-4 py-2.5 text-sm font-semibold text-white/90 shadow-sm'
          : 'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700'
      }
    >
      <Send className="h-4 w-4" strokeWidth={2.2} aria-hidden />
      Submit Warning Onchain
    </button>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function DropletIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 1L9.5 5.5C11 7.5 9.5 11 6 11C2.5 11 1 7.5 2.5 5.5L6 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Fire `cb` exactly once on the transition into `confirmed`. The identity of
 * the `confirmed` payload (txHash + uid) is used as the trigger key so a
 * future retry that resets back to idle and re-confirms with a new
 * attestation would correctly notify again. A ref guards against double-
 * firing within the same confirmation if `cb` changes identity.
 */
function useConfirmedEffect(
  state: WarningFlowState,
  cb: (state: Extract<WarningFlowState, { kind: 'confirmed' }>) => void,
) {
  const firedForRef = useRef<string | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (state.kind !== 'confirmed') {
      if (state.kind === 'idle') firedForRef.current = null;
      return;
    }
    const key = `${state.txHash}:${state.attestationUid}`;
    if (firedForRef.current === key) return;
    firedForRef.current = key;
    cbRef.current(state);
  }, [state]);
}
