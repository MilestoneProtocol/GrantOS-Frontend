'use client';

import { MilestoneInput, PaymentMode } from '@/grant-creation/store';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { GRANT_ESCROW_ADDRESS, grantEscrowAbi, CONTRACTS_READY } from '@/lib/escrow';
import { USDC_ADDRESS, USDC_DECIMALS, usdcAbi } from '@/lib/usdc';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

type ReviewConfirmProps = {
  builderAddress: string;
  zkVerified: boolean;
  grantName: string;
  category: string;
  milestones: MilestoneInput[];
  committeeMembers: string[];
  quorum: number;
  paymentMode: PaymentMode;
  onBack: () => void;
  onSuccess: (grantTxHash: string) => void;
};

function shortenAddress(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ReviewConfirm({
  builderAddress,
  zkVerified,
  grantName,
  category,
  milestones,
  committeeMembers,
  quorum,
  paymentMode,
  onBack,
  onSuccess,
}: ReviewConfirmProps) {
  const [dismissedApproveErrorKey, setDismissedApproveErrorKey] = useState('');
  const [dismissedCreateErrorKey, setDismissedCreateErrorKey] = useState('');
  const totalUsdc = useMemo(
    () => milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0),
    [milestones]
  );

  /* ── Approve USDC tx ─────────────────────────────────────────── */
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approveIsPending,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    isLoading: approveIsConfirming,
    isSuccess: approveIsConfirmed,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  /* ── Create Grant tx ─────────────────────────────────────────── */
  const {
    writeContract: writeCreate,
    data: createHash,
    isPending: createIsPending,
    error: createWriteError,
    reset: resetCreate,
  } = useWriteContract();

  const {
    isLoading: createIsConfirming,
    isSuccess: createIsConfirmed,
  } = useWaitForTransactionReceipt({
    hash: createHash,
    query: {
      enabled: Boolean(createHash),
    },
  });

  // propagate success
  useMemo(() => {
    if (createIsConfirmed && createHash) {
      onSuccess(createHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createIsConfirmed]);

  const approveError =
    (approveWriteError as Error | null)?.message ||
    (approveReceiptError as Error | null)?.message;
  const createError =
    (createWriteError as Error | null)?.message;
  const approveErrorKey = approveError ?? '';
  const createErrorKey = createError ?? '';
  const showApproveError = Boolean(approveError) && dismissedApproveErrorKey !== approveErrorKey;
  const showCreateError = Boolean(createError) && dismissedCreateErrorKey !== createErrorKey;

  useEffect(() => {
    if (!showApproveError) return;
    const timeoutId = window.setTimeout(() => setDismissedApproveErrorKey(approveErrorKey), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [approveErrorKey, showApproveError]);

  useEffect(() => {
    if (!showCreateError) return;
    const timeoutId = window.setTimeout(() => setDismissedCreateErrorKey(createErrorKey), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [createErrorKey, showCreateError]);

  /* ── Derived states ──────────────────────────────────────────── */
  const approveStage: 'idle' | 'signing' | 'confirming' | 'done' = approveIsConfirmed
    ? 'done'
    : approveIsConfirming
    ? 'confirming'
    : approveIsPending
    ? 'signing'
    : 'idle';

  const createStage: 'idle' | 'signing' | 'confirming' | 'done' = createIsConfirmed
    ? 'done'
    : createIsConfirming
    ? 'confirming'
    : createIsPending
    ? 'signing'
    : 'idle';

  // Overall tx progress stage for the progress indicator:
  // 0 = idle/awaiting-approve-sig, 1 = approve submitted, 2 = confirmed
  const txProgressStep =
    createStage === 'done' || createStage === 'confirming' || createStage === 'signing'
      ? 2
      : approveStage === 'done'
      ? 2
      : approveStage === 'confirming' || approveStage === 'signing'
      ? 1
      : 0;

  function handleApprove() {
    if (!CONTRACTS_READY || !usdcAbi) return;
    resetApprove();
    writeApprove({
      address: USDC_ADDRESS,
      abi: usdcAbi,
      functionName: 'approve',
      args: [GRANT_ESCROW_ADDRESS, parseUnits(String(totalUsdc), USDC_DECIMALS)],
    });
  }

  function handleCreate() {
    if (!CONTRACTS_READY || !grantEscrowAbi) return;
    resetCreate();
    writeCreate({
      address: GRANT_ESCROW_ADDRESS,
      abi: grantEscrowAbi,
      functionName: 'createGrant',
      args: [
        builderAddress,
        paymentMode === 'streaming',
        committeeMembers,
        quorum,
        milestones.map((m) => ({
          title: m.title,
          description: m.description,
          amount: parseUnits(m.amount || '0', USDC_DECIMALS),
          deadline: Math.floor(new Date(m.deadline).getTime() / 1000),
          proofType: m.proofType === 'zk_github' ? 0 : 1,
        })),
      ],
    });
  }

  /* ── Progress steps ──────────────────────────────────────────── */
  const progressSteps = [
    { label: 'Awaiting Signature', active: txProgressStep === 0, done: txProgressStep > 0 },
    { label: 'Submitted', active: txProgressStep === 1, done: txProgressStep > 1 },
    { label: 'Confirmed', active: false, done: txProgressStep === 2 },
  ];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="border-b border-slate-200 px-5 py-6 text-center sm:px-8 sm:py-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Review &amp; Confirm</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Please review the grant details before authorizing the onchain transaction.
        </p>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="space-y-5 px-5 py-6 sm:px-8">

        {/* Total USDC hero */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Total Grant Amount
          </p>
          <p className="mt-2 text-5xl font-bold tracking-tight text-white sm:text-6xl">
            {totalUsdc.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
            <span className="ml-3 text-xl font-semibold text-slate-400">USDC</span>
          </p>
        </div>

        {/* Grant Name + Category cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Grant Name
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {grantName || <span className="text-slate-400 font-normal italic">Unnamed Grant</span>}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Category
            </p>
            <div className="mt-2 flex items-center gap-2">
              {category ? (
                <>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <span className="text-base font-semibold text-slate-900">{category}</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal italic text-sm">No category</span>
              )}
            </div>
          </div>
        </div>

        {/* Info grid — builder + committee */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Builder Identity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Recipient Address
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-teal-500" aria-hidden />
                <span className="truncate text-sm font-medium text-slate-800">
                  {shortenAddress(builderAddress)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(builderAddress)}
                className="ml-2 shrink-0 text-slate-400 transition hover:text-slate-700"
                aria-label="Copy address"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <ZKVerifiedBadge verified={zkVerified} />
            </div>
          </div>

          {/* Committee & Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Committee &amp; Payment
            </p>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500">Payment Mode</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  paymentMode === 'streaming'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {paymentMode === 'streaming' ? 'Superfluid Streaming' : 'Lump-Sum Release'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Approval Quorum</span>
              <span className="text-sm font-semibold text-slate-900">
                {quorum} of {committeeMembers.length} members
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">Committee Size</span>
              <span className="text-sm font-semibold text-slate-900">{committeeMembers.length} members</span>
            </div>
          </div>
        </div>

        {/* Escrow contract info */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Escrow Contract
            </p>
            <p className="mt-1 font-mono text-sm text-slate-700">
              GrantEscrow.sol (Arbitrum One)
            </p>
          </div>
          <a
            href={`https://arbiscan.io/address/${GRANT_ESCROW_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition hover:text-indigo-800"
          >
            View <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Milestones table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Milestones
            </p>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {milestones.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {milestones.map((m, i) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-slate-900">
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {m.title}
                  </p>
                  <p className="max-w-lg truncate text-sm text-slate-500">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {m.deadline}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {m.proofType === 'zk_github' ? 'ZK Proof Required' : 'EAS Evidence'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-base font-bold text-slate-900">
                    {Number(m.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="ml-1.5 text-xs font-semibold text-slate-400">USDC</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="ml-3 text-base font-bold text-slate-900">
              {totalUsdc.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-slate-400">USDC</span>
          </div>
        </div>

        {/* Transaction stage indicator + action buttons */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">

          {/* Progress row */}
          <div className="mb-5 flex items-center justify-center gap-3 text-xs">
            {progressSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2">
                {idx > 0 && (
                  <span
                    className={`hidden h-px w-10 sm:block ${
                      step.done || step.active ? 'bg-indigo-300' : 'bg-slate-300'
                    }`}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : step.active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" />
                  )}
                  <span
                    className={
                      step.done
                        ? 'font-medium text-emerald-600'
                        : step.active
                        ? 'font-medium text-indigo-600'
                        : 'text-slate-400'
                    }
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* 1. Approve USDC */}
            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={
                  !CONTRACTS_READY ||
                  approveStage === 'signing' ||
                  approveStage === 'confirming' ||
                  approveStage === 'done'
                }
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
                  approveStage === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : approveStage === 'signing' || approveStage === 'confirming'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400'
                }`}
              >
                {approveStage === 'signing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving USDC…
                  </>
                ) : approveStage === 'confirming' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming…
                  </>
                ) : approveStage === 'done' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    USDC Approved
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Approve USDC
                  </>
                )}
              </button>
              {showApproveError && approveError ? (
                <p className="text-center text-xs text-red-600 leading-snug px-1">{approveError}</p>
              ) : null}
              {approveHash && (
                <a
                  href={`https://arbiscan.io/tx/${approveHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  View Approval Tx <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* 2. Create Grant */}
            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={
                  !CONTRACTS_READY ||
                  approveStage !== 'done' ||
                  createStage === 'signing' ||
                  createStage === 'confirming' ||
                  createStage === 'done'
                }
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
                  createStage === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : approveStage !== 'done'
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#1f1f1f] text-white hover:bg-black disabled:bg-slate-200 disabled:text-slate-400'
                }`}
              >
                {createStage === 'signing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Grant…
                  </>
                ) : createStage === 'confirming' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming…
                  </>
                ) : createStage === 'done' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Grant Created!
                  </>
                ) : (
                  <>
                    {approveStage !== 'done' && <Lock className="h-4 w-4 opacity-60" />}
                    Create Grant
                  </>
                )}
              </button>
              {showCreateError && createError ? (
                <p className="text-center text-xs text-red-600 leading-snug px-1">{createError}</p>
              ) : null}
              {createHash && (
                <a
                  href={`https://arbiscan.io/tx/${createHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  View Grant Tx <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            You will be asked to sign two sequential transactions in your wallet.
          </p>

          {!CONTRACTS_READY && (
            <p className="mt-2 text-center text-xs text-amber-600">
              ⚠ Contract integration not yet configured — transactions are disabled.
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          Back
        </button>
        <span className="text-xs text-slate-400">Step 5 of 5</span>
      </div>
    </div>
  );
}
