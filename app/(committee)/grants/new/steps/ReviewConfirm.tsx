'use client';

import { getPublicApiV1Base } from '@/lib/api-config';
import { MilestoneInput, PaymentMode } from '@/grant-creation/store';
import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import { GRANT_FACTORY_ADDRESS, grantFactoryAbi, CONTRACTS_READY } from '@/lib/escrow';
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
import { maxUint256, parseUnits } from 'viem';
import { useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { useDaoAdminHintStore } from '@/store/daoAdminHintStore';

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
  onSuccess: (grantTxHash: string, onChainId: number) => void;
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
  const { address: userAddress, chainId: connectedChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const markDaoAdmin = useDaoAdminHintStore((s) => s.markDaoAdmin);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: 'allowance',
    args: userAddress && GRANT_FACTORY_ADDRESS ? [userAddress, GRANT_FACTORY_ADDRESS] : undefined,
    query: {
      enabled: Boolean(userAddress && GRANT_FACTORY_ADDRESS),
    }
  });

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

  const isAllowanceSufficient = useMemo(() => {
    if (allowance === undefined) return false;
    const required = parseUnits(String(totalUsdc), USDC_DECIMALS);
    return allowance >= required;
  }, [allowance, totalUsdc]);

  useEffect(() => {
    if (approveIsConfirmed) {
      refetchAllowance();
    }
  }, [approveIsConfirmed, refetchAllowance]);

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
    data: createReceipt,
  } = useWaitForTransactionReceipt({
    hash: createHash,
    query: {
      enabled: Boolean(createHash),
    },
  });

  // propagate success + index in backend
  useEffect(() => {
    if (!createIsConfirmed || !createHash || !createReceipt) return;

    // Immediately mark this wallet as a DAO admin locally. The on-chain
    // `grantor()` read in useRoleDetection can lag by several seconds after a
    // fresh createGrant tx (RPC indexing + the count → escrows → role-reads
    // cascade). The hint bridges that gap so /dao is accessible right away.
    if (createReceipt.from) {
      markDaoAdmin(createReceipt.from);
    }

    const finalizeAndAdvance = async () => {
      // Refetch every active on-chain read (including useRoleDetection's) so
      // the cache catches up to the new grant. The hint above is the safety net
      // in case the cascade hasn't fully resolved by the time the user navigates.
      try {
        await queryClient.refetchQueries({ type: 'active' });
      } catch (err) {
        // Refetch errors are non-fatal — role detection's own polling will recover.
        console.error('refetchQueries after createGrant failed:', err);
      }

      let onChainId = 0;
      try {
        // Find the GrantCreated event in logs
        const log = createReceipt.logs.find(
          (l) => l.address.toLowerCase() === GRANT_FACTORY_ADDRESS.toLowerCase()
        );

        let escrowAddr = '0x0000000000000000000000000000000000000000';

        if (log) {
          // GrantCreated(uint256 indexed grantId, address indexed escrow, ...)
          // Topics: [0] event sig, [1] grantId, [2] escrow
          onChainId = Number(BigInt(log.topics[1] || '0'));
          escrowAddr = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
        }

        const payload = {
          onChainId,
          escrowAddress: escrowAddr,
          grantorAddress: createReceipt.from,
          granteeAddress: builderAddress,
          txHash: createHash,
          totalUsdc: parseUnits(String(totalUsdc), USDC_DECIMALS).toString(),
          isStreaming: paymentMode === 'streaming',
          quorum: Number(quorum),
          committee: committeeMembers,
          milestones: milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: parseUnits(m.amount || '0', USDC_DECIMALS).toString(),
            deadline: Math.floor(new Date(m.deadline).getTime() / 1000),
            proofType: m.proofType === 'zk_github' ? 0 : 1,
          })),
        };

        const apiBase = getPublicApiV1Base();
        await fetch(`${apiBase}/grants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        onSuccess(createHash, onChainId);
      } catch (err) {
        console.error('Failed to index grant in backend:', err);
        // Still proceed to success screen so user sees their tx
        onSuccess(createHash, onChainId);
      }
    };

    finalizeAndAdvance();
  }, [createIsConfirmed, createHash, createReceipt, builderAddress, committeeMembers, milestones, paymentMode, quorum, totalUsdc, onSuccess, queryClient, markDaoAdmin]);

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
  const approveStage: 'idle' | 'signing' | 'confirming' | 'done' = isAllowanceSufficient || approveIsConfirmed
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

  /**
   * The wallet session's active chain can drift from what wagmi reports
   * (e.g. MetaMask's multichain SDK keeps its own selected chain). Switching
   * explicitly re-syncs the provider before we send, otherwise the SDK
   * rejects the request with a "not configured in supportedNetworks" error.
   */
  async function ensureTargetChain() {
    if (connectedChainId === arbitrumSepolia.id) return;
    await switchChainAsync({ chainId: arbitrumSepolia.id });
  }

  async function handleApprove() {
    if (!CONTRACTS_READY || !usdcAbi) return;
    resetApprove();
    try {
      await ensureTargetChain();
    } catch {
      return; // user declined the network switch
    }
    writeApprove({
      chainId: arbitrumSepolia.id,
      address: USDC_ADDRESS,
      abi: usdcAbi,
      functionName: 'approve',
      args: [GRANT_FACTORY_ADDRESS, maxUint256],
      // Switch to Legacy gas price for better testnet reliability
      gasPrice: parseUnits('2', 9), // 2 Gwei
      gas: BigInt(200000),           // Manual gas limit for approval
    });
  }

  async function handleCreate() {
    if (!CONTRACTS_READY || !grantFactoryAbi) return;
    resetCreate();
    try {
      await ensureTargetChain();
    } catch {
      return; // user declined the network switch
    }
    writeCreate({
      chainId: arbitrumSepolia.id,
      address: GRANT_FACTORY_ADDRESS,
      abi: grantFactoryAbi,
      functionName: 'createGrant',
      args: [
        builderAddress as `0x${string}`,
        paymentMode === 'streaming',
        committeeMembers as `0x${string}`[],
        BigInt(quorum),
        milestones.map((m) => ({
          title: m.title,
          description: m.description,
          amount: parseUnits(m.amount || '0', USDC_DECIMALS),
          deadline: BigInt(Math.floor(new Date(m.deadline).getTime() / 1000)),
          proofType: m.proofType === 'zk_github' ? 0 : 1,
        })),
      ],
      // Switch to Legacy gas price for better testnet reliability
      gasPrice: parseUnits('2', 9), // 2 Gwei
      gas: BigInt(3000000),          // Generous gas limit for grant creation
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
                {paymentMode === 'streaming' ? 'Sablier Streaming' : 'Lump-Sum Release'}
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
              GrantEscrow.sol (Arbitrum Sepolia)
            </p>
          </div>
          <a
            href={`https://sepolia.arbiscan.io/address/${GRANT_FACTORY_ADDRESS}`}
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
                  href={`https://sepolia.arbiscan.io/tx/${approveHash}`}
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
                  href={`https://sepolia.arbiscan.io/tx/${createHash}`}
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
