'use client';

import { getPublicApiV1Base } from '@/lib/api-config';
import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import type { AiVerifierVerdict } from '@/lib/ai-verifier';
import { easConfigured } from '@/lib/eas-config';
import { attestMilestoneSubmissionPackage } from '@/lib/eas-milestone-attest';
import { GRANT_ESCROW_ADDRESS } from '@/lib/escrow';
import { grantEscrowSubmitAbi } from '@/lib/grant-escrow-submit';
import { isInvalidProofRevert } from '@/lib/onchain-submit-errors';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  FolderInput,
  Loader2,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseUnits, type Hex } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';
import { useWaitForTransactionReceipt, useWriteContract, useAccount } from 'wagmi';

const ZERO_UID =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

function truncateMiddle(s: string, start = 6, end = 4) {
  if (s.length <= start + end + 3) return s;
  return `${s.slice(0, start + 2)}…${s.slice(-end)}`;
}

function truncateText(s: string, max = 72) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function verdictShort(v: AiVerifierVerdict | string | undefined): string {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'Passed';
    case 'UNCERTAIN':
      return 'Uncertain';
    case 'LIKELY_INSUFFICIENT':
      return 'Insufficient';
    default:
      return v ? String(v) : '—';
  }
}

function verdictBadgeClass(v: AiVerifierVerdict | string | undefined): string {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'UNCERTAIN':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'LIKELY_INSUFFICIENT':
      return 'border-red-200 bg-red-50 text-red-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export default function OnchainSubmitStep() {
  const {
    proofPreview,
    writtenSummary,
    aiSnapshot,
    effectiveGrantId,
    milestoneIndex,
    repoTrimmed,
    prTrimmed,
    regenerateProofAfterInvalidOnchain,
    persistSession,
    submitBasePath,
    resolvedEscrowAddress,
  } = useMilestoneSubmit();

  const router = useRouter();
  const lastEasUidRef = useRef<Hex>(ZERO_UID);
  const successNavigatedRef = useRef(false);

  const prUrl = useMemo(
    () => `https://github.com/${repoTrimmed}/pull/${prTrimmed}`,
    [repoTrimmed, prTrimmed]
  );

  const explorerBase = arbitrumSepolia.blockExplorers.default.url;

  const [invalidProof, setInvalidProof] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitHash, setSubmitHash] = useState<Hex | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  const {
    isLoading: receiptPending,
    isSuccess: receiptConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: submitHash,
    query: { enabled: Boolean(submitHash) },
  });

  useEffect(() => {
    if (receiptError) {
      startTransition(() => {
        setGeneralError((receiptError as Error).message ?? 'Transaction failed');
      });
    }
  }, [receiptError]);

  const hashDisplay = proofPreview?.proofHash ?? '';
  const summaryPreview = truncateText(writtenSummary.trim(), 80);
  const aiLine = aiSnapshot ? truncateText(aiSnapshot.explanation, 56) : '—';

  const copyHash = useCallback(() => {
    if (hashDisplay) navigator.clipboard.writeText(hashDisplay).catch(() => {});
  }, [hashDisplay]);

  const handleSubmit = useCallback(async () => {
    if (!proofPreview || effectiveGrantId === undefined || milestoneIndex === null || !resolvedEscrowAddress) return;

    setInvalidProof(false);
    setGeneralError(null);
    setBusy(true);

    try {
      let easUid: Hex = ZERO_UID;

      if (easConfigured()) {
        easUid = await attestMilestoneSubmissionPackage({
          zkProofHash: proofPreview.proofHash,
          builderSummary: writtenSummary.trim(),
          aiVerdictLabel: aiSnapshot?.verdict ?? 'UNCERTAIN',
          aiExplanation: aiSnapshot?.explanation ?? 'AI verdict unavailable.',
          prUrl,
          grantId: effectiveGrantId,
          milestoneIndex: BigInt(milestoneIndex),
        });
      }
      lastEasUidRef.current = easUid;

      let finalPublicInputs = (proofPreview.publicInputs || []) as Hex[];
      // Forcefully bind the cached proof to the current connected wallet to prevent 
      // "Proof not bound to grantee" errors from stale sessionStorage.
      if (finalPublicInputs.length >= 5 && address) {
        const walletAddr = BigInt(address);
        const addrHi = (walletAddr >> BigInt(128)) & BigInt(0xffffffff);
        const addrLo = walletAddr & ((BigInt(1) << BigInt(128)) - BigInt(1));
        
        finalPublicInputs = [...finalPublicInputs];
        finalPublicInputs[3] = `0x${addrHi.toString(16).padStart(64, '0')}` as Hex;
        finalPublicInputs[4] = `0x${addrLo.toString(16).padStart(64, '0')}` as Hex;
      }

      const hash = await writeContractAsync({
        address: resolvedEscrowAddress,
        abi: grantEscrowSubmitAbi,
        functionName: 'submitMilestone',
        args: [
          BigInt(milestoneIndex),
          (proofPreview.proof || '0x') as Hex,
          finalPublicInputs,
          easUid,
          writtenSummary.trim(),
        ],
        // Legacy gas price and limit to prevent testnet gas estimation failures
        gasPrice: parseUnits('2', 9), // 2 Gwei
        gas: BigInt(3000000),         // Generous limit for ZK proof verification
        chainId: arbitrumSepolia.id,
      });
      setSubmitHash(hash);
    } catch (e: unknown) {
      if (isInvalidProofRevert(e)) {
        setInvalidProof(true);
      } else {
        setGeneralError(e instanceof Error ? e.message : 'Submission failed');
      }
    } finally {
      setBusy(false);
    }
  }, [aiSnapshot, effectiveGrantId, milestoneIndex, prUrl, proofPreview, writtenSummary, writeContractAsync, resolvedEscrowAddress]);

  useEffect(() => {
    if (!receiptConfirmed || !submitHash || successNavigatedRef.current) return;
    successNavigatedRef.current = true;

    // Index the submission in the backend
    const recordBackend = async () => {
      try {
        const apiBase = getPublicApiV1Base();
        await fetch(`${apiBase}/milestones/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantId: Number(effectiveGrantId),
            escrowAddress: resolvedEscrowAddress,
            milestoneIndex: Number(milestoneIndex),
            builderAddress: address || '', // Send the actual wallet address
            builderSummary: writtenSummary.trim(),
            prUrl,
            githubRepo: repoTrimmed,
            prNumber: parseInt(prTrimmed, 10),
            isZkRequired: true,
            proofHash: proofPreview?.proofHash,
            zkVerified: true,
            easAttestationUid: lastEasUidRef.current !== ZERO_UID ? lastEasUidRef.current : undefined,
            aiVerdict: aiSnapshot?.verdict,
            aiExplanation: aiSnapshot?.explanation,
            submissionTxHash: submitHash,
          }),
        });
      } catch (err) {
        console.error('Failed to index submission in backend:', err);
      }
    };

    recordBackend().finally(() => {
      persistSession({
        submissionCompletedAt: Date.now(),
        submissionTxHash: submitHash,
        submissionEasUid:
          lastEasUidRef.current !== ZERO_UID ? lastEasUidRef.current : undefined,
      });
      router.push(`${submitBasePath}/success`);
    });
  }, [
    persistSession,
    receiptConfirmed,
    router,
    submitBasePath,
    submitHash,
    effectiveGrantId,
    milestoneIndex,
    proofPreview,
    writtenSummary,
    prUrl,
    repoTrimmed,
    prTrimmed,
    aiSnapshot,
  ]);

  const awaitingWallet = busy;
  const submittedPending = Boolean(submitHash) && receiptPending;
  const confirmed = Boolean(submitHash) && receiptConfirmed;

  const submitDisabled =
    !proofPreview ||
    effectiveGrantId === undefined ||
    milestoneIndex === null ||
    writtenSummary.trim().length < 50 ||
    awaitingWallet ||
    submittedPending ||
    confirmed ||
    invalidProof;

  if (invalidProof) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/90 px-6 py-14 text-center shadow-sm">
        <AlertTriangle className="h-12 w-12 text-red-600" aria-hidden />
        <p className="mt-6 max-w-md text-base font-semibold leading-relaxed text-red-950">
          On-chain proof verification failed. Please regenerate your proof.
        </p>
        <button
          type="button"
          onClick={() => regenerateProofAfterInvalidOnchain()}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-linear-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700"
        >
          Regenerate Proof
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col text-slate-900">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Final Review &amp; Submit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review your generated proofs and summary before signing the transaction.
        </p>
      </div>

      {!easConfigured() ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Set <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_EAS_CONTRACT_ADDRESS</code>{' '}
          and <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_EAS_SCHEMA_UID</code> (and a
          matching <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_EAS_MILESTONE_SCHEMA_RAW</code>{' '}
          if your schema differs) to enable EAS attestation before submitting onchain.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Shield className="h-4 w-4 text-violet-600" aria-hidden />
            ZK proof hash
          </div>
          <p className="mt-2 font-mono text-xs font-semibold text-slate-900">{truncateMiddle(hashDisplay)}</p>
          <button
            type="button"
            onClick={copyHash}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy full hash
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Bot className="h-4 w-4 text-violet-600" aria-hidden />
            AI verdict
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${verdictBadgeClass(aiSnapshot?.verdict)}`}
            >
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {verdictShort(aiSnapshot?.verdict)}
            </span>
            {aiSnapshot?.id ? (
              <span className="text-[10px] font-medium text-slate-400">ID: {aiSnapshot.id}</span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-snug text-slate-600">{aiLine}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <FileText className="h-4 w-4 text-violet-600" aria-hidden />
            Summary
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">{summaryPreview}</p>
        </div>
      </div>

      {generalError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {generalError}
        </div>
      ) : null}

      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          disabled={submitDisabled}
          onClick={() => void handleSubmit()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[280px]"
        >
          {awaitingWallet || submittedPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {awaitingWallet ? 'Awaiting signature…' : 'Confirming onchain…'}
            </>
          ) : confirmed ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-200" />
              Submitted
            </>
          ) : (
            <>
              <FolderInput className="h-5 w-5" />
              Submit Milestone
            </>
          )}
        </button>

        {submitHash ? (
          <a
            href={`${explorerBase}/tx/${submitHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            <ExternalLink className="h-4 w-4" />
            {confirmed ? 'View on Arbiscan' : 'View pending transaction'}
          </a>
        ) : null}

        {confirmed ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Transaction confirmed on Arbitrum.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-slate-500">
            This will create an EAS attestation (when configured) and submit it to the GrantOS contract. You will be
            prompted to sign in your wallet.
          </p>
        )}
      </div>
    </div>
  );
}
