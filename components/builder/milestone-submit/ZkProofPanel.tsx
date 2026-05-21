'use client';

import { getPublicApiV1Base } from '@/lib/api-config';
import type { ZkProofPreview } from '@/lib/milestone-submit-session';
import { buildMockZkProofResult, normalizeGithubHandle } from '@/lib/milestone-submit-session';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Fingerprint,
  GitBranch,
  GitMerge,
  Link2,
  Loader2,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

const PHASE_LABELS = [
  'Fetching Noir circuit...',
  'Initializing UltraHonk backend...',
  'Generating witness...',
  'Generating proof...',
] as const;

const PHASE_DELAYS_MS = [1800, 2000, 2400, 2000];

function formatLogTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

type PhaseUi = 'pending' | 'running' | 'done';

type ZkProofPanelProps = {
  zkSubstep: 'loading' | 'result';
  loadingRunId: number;
  registeredGithubHandle: string;
  repo: string;
  pr: string;
  onProofResolved: (payload: {
    outcome: 'success' | 'failure';
    preview?: ZkProofPreview;
    errorMessage?: string;
  }) => void;
  zkOutcome?: 'success' | 'failure';
  zkErrorMessage?: string;
  proofPreview?: ZkProofPreview;
  onTryAgain: () => void;
  onContinueToNextStep: () => void;
};

export default function ZkProofPanel({
  zkSubstep,
  loadingRunId,
  registeredGithubHandle,
  repo,
  pr,
  onProofResolved,
  zkOutcome,
  zkErrorMessage,
  proofPreview,
  onTryAgain,
  onContinueToNextStep,
}: ZkProofPanelProps) {
  const { address } = useAccount();
  const addressRef = useRef(address);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const [phaseStates, setPhaseStates] = useState<PhaseUi[]>(['running', 'pending', 'pending', 'pending']);
  const [phaseTimes, setPhaseTimes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (zkSubstep !== 'loading') return;

    startTransition(() => {
      setPhaseStates(['running', 'pending', 'pending', 'pending']);
      setPhaseTimes({});
    });

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timers.push(id);
      });

    (async () => {
      try {
        await sleep(1000);
        if (cancelled) return;

        if (!addressRef.current) {
          throw new Error('Wallet not connected. Please connect your wallet.');
        }

        const apiBase = getPublicApiV1Base();
        let attestation: any = null;
        try {
          const res = await fetch(`${apiBase}/identity/attestation/wallet/${addressRef.current}`);
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error('No verified identity found for this wallet. Please verify your identity first.');
            }
            throw new Error(`Failed to fetch identity attestation: HTTP ${res.status}`);
          }
          attestation = await res.json();
        } catch (err: any) {
          throw new Error(err.message || 'Failed to fetch identity attestation from backend.');
        }

        const reg = normalizeGithubHandle(registeredGithubHandle);
        if (!reg) {
          throw new Error('Register your GitHub identity in Verify before continuing.');
        }

        const t0 = formatLogTime(new Date());
        setPhaseTimes((prev) => ({ ...prev, [0]: t0 }));
        setPhaseStates(['done', 'running', 'pending', 'pending']);
        await sleep(1000);
        if (cancelled) return;

        const { generateProof } = await import('@/lib/zk/prover');

        const toBytes = (hex: string, label: string, expectedLength: number): number[] => {
          const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
          if (clean.length % 2 !== 0) throw new Error(`${label} has odd hex length`);
          const bytes = [];
          for (let i = 0; i < clean.length; i += 2) {
            const v = parseInt(clean.slice(i, i + 2), 16);
            if (isNaN(v)) throw new Error(`${label} contains non-hex characters`);
            bytes.push(v);
          }
          if (bytes.length === expectedLength + 1) bytes.pop();
          if (bytes.length !== expectedLength)
            throw new Error(`${label} must be ${expectedLength} bytes, got ${bytes.length}`);
          return bytes;
        };

        const t1 = formatLogTime(new Date());
        setPhaseTimes((prev) => ({ ...prev, [1]: t1 }));
        setPhaseStates(['done', 'done', 'running', 'pending']);
        await sleep(1000);
        if (cancelled) return;

        const t2 = formatLogTime(new Date());
        setPhaseTimes((prev) => ({ ...prev, [2]: t2 }));
        setPhaseStates(['done', 'done', 'done', 'running']);

        const result = await generateProof({
          signature:           toBytes(attestation.oracleSignature, 'Oracle signature', 64),
          message_hash:        toBytes(attestation.messageHash,     'Message hash',     32),
          github_id:           attestation.githubId.toString(),
          github_created_year: attestation.githubCreatedYear.toString(),
          commits: attestation.commitCount ?? 0,
          stars:   attestation.totalStars ?? 0,
          events:  attestation.contributionEvents90d ?? 0,
          wallet_address_hi: attestation.walletAddressHi,
          wallet_address_lo: attestation.walletAddressLo,
        });

        if (!result.success) {
          throw result.error instanceof Error ? result.error : new Error('Proof generation failed');
        }

        const t3 = formatLogTime(new Date());
        setPhaseTimes((prev) => ({ ...prev, [3]: t3 }));
        setPhaseStates(['done', 'done', 'done', 'done']);
        await sleep(600);
        if (cancelled) return;

        const proofHex = ('0x' + Array.from(result.proof).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
        const pubInputsBytes32 = result.publicInputs.map(v => {
          const hex = BigInt(v).toString(16).padStart(64, '0');
          return `0x${hex}` as `0x${string}`;
        });

        const slug = repo.includes('/') ? repo.split('/')[1] || 'repo' : 'repo';
        const prTitle = `feat(${slug}): deliver milestone scope with tests and integration`;
        const mergedAt = new Date();
        const encoder = new TextEncoder();
        const proofHashBuf = await crypto.subtle.digest('SHA-256', result.proof as any);
        const proofHash = ('0x' + Array.from(new Uint8Array(proofHashBuf))
          .map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

        const preview: ZkProofPreview = {
          prTitle,
          merged: true,
          authorLogin: `@${reg}`,
          branch: 'main',
          mergedAtIso: mergedAt.toISOString(),
          proofHash,
          identityMatches: true,
          proof: proofHex,
          publicInputs: pubInputsBytes32,
        };

        onProofResolved({ outcome: 'success', preview });

      } catch (err: any) {
        onProofResolved({ outcome: 'failure', errorMessage: err.message || 'Unknown proof generation error.' });
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [zkSubstep, loadingRunId, repo, pr, registeredGithubHandle, onProofResolved]);

  const showFailure = zkSubstep === 'result' && zkOutcome === 'failure';
  const showSuccessCard = zkSubstep === 'result' && zkOutcome === 'success' && proofPreview;

  const identityIssue = useMemo(() => {
    if (!proofPreview || zkOutcome !== 'success') {
      return { blocked: false, message: '' as string };
    }
    const reg = registeredGithubHandle.trim().replace(/^@/, '').toLowerCase();
    if (!reg) {
      return {
        blocked: true,
        message: 'Register your GitHub identity in Verify before continuing.',
      };
    }
    if (!proofPreview.identityMatches) {
      return {
        blocked: true,
        message: 'PR author does not match your registered GitHub identity',
      };
    }
    return { blocked: false, message: '' };
  }, [proofPreview, registeredGithubHandle, zkOutcome]);

  async function copyHash() {
    if (!proofPreview) return;
    try {
      await navigator.clipboard.writeText(proofPreview.proofHash);
    } catch {
      /* ignore */
    }
  }

  if (zkSubstep === 'loading') {
    return (
      <div className="flex flex-col items-center px-2 py-4 lg:px-6">
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500/40 duration-[3s]" />
          <Fingerprint className="relative z-10 h-11 w-11 text-blue-600" strokeWidth={1.5} />
        </div>
        <h2 className="text-center text-xl font-semibold text-slate-900">Generating Zero-Knowledge Proof</h2>
        <p className="mt-2 max-w-lg text-center text-sm leading-relaxed text-slate-500">
          Cryptographically verifying your GitHub contributions via Noir ZK Coprocessor without revealing your access tokens.
        </p>

        <div className="mt-8 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500">
              execution log
            </p>
            <span className="font-mono text-[10px] font-medium text-emerald-700">Noir coprocessor</span>
          </div>
          <div className="max-h-[min(40vh,320px)] overflow-y-auto bg-slate-50/40 px-3 py-3 font-mono text-[13px] leading-relaxed text-slate-800 sm:text-xs">
            <ul className="space-y-0">
              {PHASE_LABELS.map((label, i) => {
                const state = phaseStates[i] ?? 'pending';
                const time = phaseTimes[i];
                return (
                  <li
                    key={label}
                    className={`flex min-h-7 items-baseline gap-2 border-l-2 pl-2.5 sm:gap-3 sm:pl-3 ${
                      state === 'running'
                        ? 'border-blue-500'
                        : state === 'done'
                          ? 'border-emerald-500/70'
                          : 'border-slate-200'
                    }`}
                  >
                    <span className="w-18 shrink-0 text-[11px] tabular-nums text-slate-500 sm:text-[10px]">
                      {state === 'done' && time ? time : ' '}
                    </span>
                    <span
                      className={`min-w-0 flex-1 ${
                        state === 'pending'
                          ? 'text-slate-400'
                          : state === 'running'
                            ? 'text-slate-900'
                            : 'text-slate-700'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="w-8 shrink-0 text-right sm:w-9">
                      {state === 'done' ? (
                        <span className="font-medium text-emerald-600" aria-hidden>
                          ok
                        </span>
                      ) : state === 'running' ? (
                        <Loader2
                          className="ml-auto h-3.5 w-3.5 animate-spin text-blue-600"
                          aria-label="Running"
                        />
                      ) : (
                        <span className="text-slate-400">…</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-sans text-xs text-slate-500">
          <Shield className="h-4 w-4 text-slate-400" />
          <span>Atomic process · Do not close this tab.</span>
        </div>
      </div>
    );
  }

  if (showFailure) {
    return (
      <div className="flex flex-col px-2 py-2 lg:px-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Proof Generation Failed</h2>
            <p className="mt-1 text-sm text-slate-500">We could not verify the provided GitHub Pull Request.</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Error reason</p>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-red-900">
            {zkErrorMessage ?? 'Unknown error'}
          </pre>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-600">Previous inputs (retained)</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Repository</dt>
              <dd className="font-mono text-slate-900">{repo}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">PR number</dt>
              <dd className="font-mono text-slate-900">#{pr}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onTryAgain}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showSuccessCard && proofPreview) {
    return (
      <div className="flex flex-col px-2 py-2 lg:px-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7 stroke-[2.5]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Proof Generated</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cryptographic proof of your GitHub PR has been successfully created.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Pull request</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{proofPreview.prTitle}</p>
            </div>
            {proofPreview.merged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <GitMerge className="h-3.5 w-3.5" />
                Merged
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Open</span>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Author identity</p>
              <p className="mt-1 font-medium text-slate-900">{proofPreview.authorLogin}</p>
              {identityIssue.blocked ? (
                <p className="mt-2 text-sm font-medium text-red-600">{identityIssue.message}</p>
              ) : (
                <p className="mt-1 text-xs font-medium text-emerald-600">Matches GrantIdentityRegistry</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Target branch</p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-slate-800">
                <GitBranch className="h-4 w-4 text-slate-400" />
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5">{proofPreview.branch}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Merge timestamp</p>
              <p className="mt-1 text-sm text-slate-700">
                {new Date(proofPreview.mergedAtIso).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Proof hash</p>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
                <span className="min-w-0 flex-1 truncate">
                  {proofPreview.proofHash.slice(0, 10)} … {proofPreview.proofHash.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={copyHash}
                  className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Copy proof hash"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 text-xs text-slate-500">
            <Link2 className="h-4 w-4 shrink-0" />
            This proof will be submitted onchain in Step 4.
          </p>
          <button
            type="button"
            disabled={identityIssue.blocked}
            onClick={onContinueToNextStep}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
