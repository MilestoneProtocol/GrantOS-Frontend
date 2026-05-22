'use client';

import {
  GRANT_FACTORY_ADDRESS,
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
  MILESTONE_STATUS_PENDING,
} from '@/lib/escrow';
import { parseGrantIdFromPath } from '@/lib/grant-id';
import type {
  MilestoneSubmissionSuccessMeta,
  MilestoneSubmitPersisted,
  ZkProofPreview,
} from '@/lib/milestone-submit-session';
import {
  milestoneSubmitStorageKey,
  readMilestoneSubmitSession,
  writeMilestoneSubmitSession,
} from '@/lib/milestone-submit-session';
import { USDC_DECIMALS } from '@/lib/usdc';
import type { AiVerifierSuccessBody, AiVerifierVerdict } from '@/lib/ai-verifier';
import { isUiDemoPathSegment } from '@/demo';
import { useParams, useRouter } from 'next/navigation';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { formatUnits, zeroAddress, type Address } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

export type GrantTuple = {
  builder: Address;
  streaming: boolean;
  committee: Address[];
  quorum: bigint;
  createdAt: bigint;
  milestones: Array<{
    title: string;
    description: string;
    amount: bigint;
    deadline: bigint;
    proofType: number;
  }>;
};

export const GITHUB_REPO_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\/[a-zA-Z0-9._-]{1,100}$/;

export function formatSubmitUsdc(amount: bigint) {
  return Number(formatUnits(amount, USDC_DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type Gate = { kind: 'loading' } | { kind: 'ok' } | { kind: 'redirect'; toast: string };

type MilestoneSubmitContextValue = {
  gate: Gate;
  submitBasePath: string;
  routeGrantId: string;
  grantIdParsed: bigint | undefined;
  /** Grant id for chain writes (`ui-demo` uses demo display id). */
  effectiveGrantId: bigint | undefined;
  milestoneIndex: number | null;
  isDemoRoute: boolean;
  storageKey: string | null;
  displayTuple: GrantTuple | undefined;
  displayMilestone: GrantTuple['milestones'][number] | undefined;
  grantLabel: string;
  /** Single subtitle line under “Milestone Submission” (e.g. `Grant: …` or `Grant #…`). */
  grantHeaderSubtitle: string;
  deadlineLabel: string;
  registeredGithubHandle: string;
  repo: string;
  setRepo: (v: string) => void;
  pr: string;
  setPr: (v: string) => void;
  touchedRepo: boolean;
  setTouchedRepo: (v: boolean) => void;
  touchedPr: boolean;
  setTouchedPr: (v: boolean) => void;
  repoTrimmed: string;
  prTrimmed: string;
  repoValid: boolean;
  prValid: boolean;
  repoError: boolean;
  prError: boolean;
  canContinueStep1: boolean;
  persistSession: (patch: Partial<MilestoneSubmitPersisted>) => void;
  zkSubstep: 'loading' | 'result' | null;
  setZkSubstep: (v: 'loading' | 'result' | null) => void;
  loadingRunId: number;
  setLoadingRunId: React.Dispatch<React.SetStateAction<number>>;
  zkOutcome: 'success' | 'failure' | undefined;
  setZkOutcome: (v: 'success' | 'failure' | undefined) => void;
  zkErrorMessage: string | undefined;
  setZkErrorMessage: (v: string | undefined) => void;
  proofPreview: ZkProofPreview | undefined;
  setProofPreview: (v: ZkProofPreview | undefined) => void;
  uiStep: 1 | 2 | 3 | 4;
  setUiStep: (v: 1 | 2 | 3 | 4) => void;
  onProofResolved: (payload: {
    outcome: 'success' | 'failure';
    preview?: ZkProofPreview;
    errorMessage?: string;
  }) => void;
  onZkTryAgain: () => void;
  continueFromStep1ToProof: () => void;
  continueToSummary: () => void;
  /** Step 3 written summary for the committee (persisted). */
  writtenSummary: string;
  setWrittenSummary: (value: string) => void;
  backToProofFromSummary: () => void;
  continueToOnchain: () => void;
  /** AI verdict snapshot from step 3 (persisted when available). */
  aiSnapshot: AiVerifierSuccessBody | null;
  setAiSnapshot: (value: AiVerifierSuccessBody | null) => void;
  /** After InvalidProof onchain — reset ZK step and return to proof generation. */
  regenerateProofAfterInvalidOnchain: () => void;
  /** Present after onchain tx confirms (hydrated from session). */
  submissionMeta: MilestoneSubmissionSuccessMeta | null;
  submitSessionReady: boolean;
  resolvedEscrowAddress: Address | undefined;
};

const MilestoneSubmitContext = createContext<MilestoneSubmitContextValue | null>(null);

export function useMilestoneSubmit() {
  const ctx = useContext(MilestoneSubmitContext);
  if (!ctx) throw new Error('useMilestoneSubmit must be used within MilestoneSubmitProvider');
  return ctx;
}

export function MilestoneSubmitProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string; milestoneId: string }>();
  const router = useRouter();
  const routeGrantId = params?.id ?? '';
  const routeMilestoneId = params?.milestoneId ?? '';

  const submitBasePath = `/grants/${encodeURIComponent(routeGrantId)}/milestones/${encodeURIComponent(routeMilestoneId)}/submit`;

  const { address, status } = useAccount();
  const redirected = useRef(false);

  const [repo, setRepo] = useState('');
  const [pr, setPr] = useState('');
  const [touchedRepo, setTouchedRepo] = useState(false);
  const [touchedPr, setTouchedPr] = useState(false);

  const [uiStep, setUiStep] = useState<1 | 2 | 3 | 4>(1);
  const [zkSubstep, setZkSubstep] = useState<'loading' | 'result' | null>(null);
  const [loadingRunId, setLoadingRunId] = useState(0);
  const [zkOutcome, setZkOutcome] = useState<'success' | 'failure' | undefined>(undefined);
  const [zkErrorMessage, setZkErrorMessage] = useState<string | undefined>(undefined);
  const [proofPreview, setProofPreview] = useState<ZkProofPreview | undefined>(undefined);
  const [writtenSummary, setWrittenSummaryState] = useState('');
  const [aiSnapshot, setAiSnapshotState] = useState<AiVerifierSuccessBody | null>(null);
  const [submissionMeta, setSubmissionMeta] = useState<MilestoneSubmissionSuccessMeta | null>(
    null
  );

  const sessionHydrated = useRef(false);
  const [submitSessionReady, setSubmitSessionReady] = useState(false);

  const grantIdParsed = useMemo(() => parseGrantIdFromPath(routeGrantId), [routeGrantId]);
  const milestoneIndex = useMemo(() => {
    const n = Number.parseInt(routeMilestoneId, 10);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }, [routeMilestoneId]);

  const { data: factoryEscrowAddress } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: [{ name: 'grants', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] }],
    functionName: 'grants',
    args: grantIdParsed !== undefined ? [grantIdParsed] : undefined,
    query: { enabled: grantIdParsed !== undefined },
  });

  const resolvedEscrowAddress =
    factoryEscrowAddress && factoryEscrowAddress !== zeroAddress
      ? (factoryEscrowAddress as Address)
      : undefined;

  const {
    data: grantData,
    isLoading: grantLoading,
    isError: grantFetchError,
    isFetched: grantFetched,
  } = useReadContract({
    address: resolvedEscrowAddress,
    abi: grantEscrowReadAbi,
    functionName: 'getGrant',
    query: { enabled: resolvedEscrowAddress !== undefined },
  });

  const grantTuple = grantData as GrantTuple | undefined;

  const builderMatches =
    Boolean(address && grantTuple?.builder) &&
    grantTuple!.builder.toLowerCase() === address!.toLowerCase();

  const indexInRange =
    grantTuple &&
    milestoneIndex !== null &&
    milestoneIndex < grantTuple.milestones.length;

  const milestone = indexInRange ? grantTuple!.milestones[milestoneIndex]! : undefined;

  const zkMilestone = milestone && milestone.proofType === 0;

  const statusQueryEnabled =
    Boolean(
      grantFetched &&
        !grantFetchError &&
        grantTuple &&
        address &&
        builderMatches &&
        milestoneIndex !== null &&
        indexInRange &&
        zkMilestone &&
        resolvedEscrowAddress !== undefined
    );

  const {
    data: milestoneStatusData,
    isLoading: statusLoading,
    isError: statusFetchError,
    isFetched: statusFetched,
  } = useReadContract({
    address: resolvedEscrowAddress,
    abi: grantEscrowReadAbi,
    functionName: 'getMilestoneStatus',
    args:
      statusQueryEnabled && milestoneIndex !== null
        ? [BigInt(milestoneIndex)]
        : undefined,
    query: { enabled: statusQueryEnabled },
  });

  const milestoneStatus =
    milestoneStatusData !== undefined ? Number(milestoneStatusData) : undefined;

  const storageKey = useMemo(
    () => milestoneSubmitStorageKey(false, grantIdParsed, milestoneIndex),
    [grantIdParsed, milestoneIndex]
  );

  useEffect(() => {
    sessionHydrated.current = false;
    startTransition(() => {
      setSubmitSessionReady(false);
      setRepo('');
      setPr('');
      setTouchedRepo(false);
      setTouchedPr(false);
      setUiStep(1);
      setZkSubstep(null);
      setLoadingRunId(0);
      setZkOutcome(undefined);
      setZkErrorMessage(undefined);
      setProofPreview(undefined);
      setWrittenSummaryState('');
      setAiSnapshotState(null);
      setSubmissionMeta(null);
    });
  }, [storageKey]);

  const { data: identityTuple } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const registeredGithubHandle =
    typeof (identityTuple as any)?.githubHandle === 'string' ? ((identityTuple as any).githubHandle as string) : '';

  const gate: Gate = useMemo(() => {
    if (isUiDemoPathSegment(routeGrantId)) {
      return { kind: 'redirect', toast: 'grant_not_found' };
    }

    if (status === 'connecting' || status === 'reconnecting') return { kind: 'loading' };
    if (status === 'disconnected') return { kind: 'redirect', toast: 'connect_wallet' };
    if (status !== 'connected' || !address) return { kind: 'loading' };

    if (grantIdParsed === undefined) return { kind: 'redirect', toast: 'grant_not_found' };
    if (milestoneIndex === null) return { kind: 'redirect', toast: 'milestone_not_found' };

    if (!grantFetched || grantLoading) return { kind: 'loading' };
    if (grantFetchError || !grantTuple) return { kind: 'redirect', toast: 'grant_not_found' };
    if (grantTuple.builder.toLowerCase() !== address.toLowerCase())
      return { kind: 'redirect', toast: 'not_grantee' };
    if (milestoneIndex >= grantTuple.milestones.length)
      return { kind: 'redirect', toast: 'milestone_not_found' };

    const m = grantTuple.milestones[milestoneIndex]!;
    if (m.proofType !== 0) return { kind: 'redirect', toast: 'milestone_not_pending' };

    if (!statusFetched || statusLoading) return { kind: 'loading' };
    if (statusFetchError) return { kind: 'redirect', toast: 'milestone_status_error' };
    if (milestoneStatus !== MILESTONE_STATUS_PENDING)
      return { kind: 'redirect', toast: 'milestone_not_pending' };

    return { kind: 'ok' };
  }, [
    address,
    grantFetchError,
    grantFetched,
    grantIdParsed,
    grantLoading,
    grantTuple,
    milestoneIndex,
    milestoneStatus,
    routeGrantId,
    status,
    statusFetchError,
    statusFetched,
    statusLoading,
  ]);

  useEffect(() => {
    if (redirected.current) return;
    if (gate.kind !== 'redirect') return;
    redirected.current = true;
    router.replace(`/builder?toast=${gate.toast}`);
  }, [gate, router]);

  useEffect(() => {
    if (gate.kind !== 'ok') return;
    if (!storageKey) {
      startTransition(() => setSubmitSessionReady(true));
      return;
    }
    if (sessionHydrated.current) return;
    sessionHydrated.current = true;
    const parsed = readMilestoneSubmitSession(
      typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null
    );
    startTransition(() => {
      if (parsed) {
        setRepo(parsed.repo);
        setPr(parsed.pr);
        setUiStep(parsed.uiStep);
        if (parsed.uiStep === 2 && !parsed.zkSubstep) {
          setZkSubstep(parsed.proofPreview || parsed.zkOutcome ? 'result' : 'loading');
        } else if (parsed.zkSubstep) {
          setZkSubstep(parsed.zkSubstep);
        }
        if (parsed.zkOutcome) setZkOutcome(parsed.zkOutcome);
        if (parsed.zkErrorMessage) setZkErrorMessage(parsed.zkErrorMessage);
        if (parsed.proofPreview) setProofPreview(parsed.proofPreview);
        if (parsed.writtenSummary) setWrittenSummaryState(parsed.writtenSummary);
        if (parsed.aiVerdict && parsed.aiExplanation) {
          setAiSnapshotState({
            verdict: parsed.aiVerdict as AiVerifierVerdict,
            explanation: parsed.aiExplanation,
            id: parsed.aiVerifierId,
          });
        }
        if (parsed.submissionCompletedAt && parsed.submissionTxHash) {
          setSubmissionMeta({
            completedAt: parsed.submissionCompletedAt,
            txHash: parsed.submissionTxHash,
            easUid: parsed.submissionEasUid,
          });
        }
      }
      setSubmitSessionReady(true);
    });
  }, [gate.kind, storageKey]);

  const persistSession = useCallback(
    (patch: Partial<MilestoneSubmitPersisted>) => {
      if (!storageKey) return;
      const base =
        readMilestoneSubmitSession(
          typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null
        ) ?? {
          repo: repo.trim(),
          pr: pr.trim(),
          savedAt: Date.now(),
          uiStep: 1 as const,
        };
      const next: MilestoneSubmitPersisted = {
        ...base,
        repo: patch.repo !== undefined ? patch.repo : base.repo,
        pr: patch.pr !== undefined ? patch.pr : base.pr,
        uiStep: patch.uiStep !== undefined ? patch.uiStep : base.uiStep,
        savedAt: Date.now(),
        zkSubstep: patch.zkSubstep !== undefined ? patch.zkSubstep : base.zkSubstep,
        zkOutcome: patch.zkOutcome !== undefined ? patch.zkOutcome : base.zkOutcome,
        zkErrorMessage:
          patch.zkErrorMessage !== undefined ? patch.zkErrorMessage : base.zkErrorMessage,
        proofPreview: patch.proofPreview !== undefined ? patch.proofPreview : base.proofPreview,
        writtenSummary:
          patch.writtenSummary !== undefined ? patch.writtenSummary : base.writtenSummary,
        aiVerdict: patch.aiVerdict !== undefined ? patch.aiVerdict : base.aiVerdict,
        aiExplanation:
          patch.aiExplanation !== undefined ? patch.aiExplanation : base.aiExplanation,
        aiVerifierId:
          patch.aiVerifierId !== undefined ? patch.aiVerifierId : base.aiVerifierId,
        submissionCompletedAt:
          patch.submissionCompletedAt !== undefined
            ? patch.submissionCompletedAt
            : base.submissionCompletedAt,
        submissionTxHash:
          patch.submissionTxHash !== undefined
            ? patch.submissionTxHash
            : base.submissionTxHash,
        submissionEasUid:
          patch.submissionEasUid !== undefined
            ? patch.submissionEasUid
            : base.submissionEasUid,
      };
      writeMilestoneSubmitSession(storageKey, next);
      if (
        patch.submissionCompletedAt !== undefined &&
        typeof patch.submissionTxHash === 'string' &&
        patch.submissionTxHash.length > 0
      ) {
        setSubmissionMeta({
          completedAt: patch.submissionCompletedAt!,
          txHash: patch.submissionTxHash!,
          easUid: patch.submissionEasUid,
        });
      }
    },
    [storageKey, repo, pr]
  );

  const setAiSnapshot = useCallback(
    (value: AiVerifierSuccessBody | null) => {
      setAiSnapshotState(value);
      if (!value) {
        persistSession({
          aiVerdict: '',
          aiExplanation: '',
          aiVerifierId: '',
        });
        return;
      }
      persistSession({
        aiVerdict: value.verdict,
        aiExplanation: value.explanation,
        aiVerifierId: value.id,
      });
    },
    [persistSession]
  );

  const setWrittenSummary = useCallback(
    (value: string) => {
      setWrittenSummaryState(value);
      persistSession({ writtenSummary: value });
    },
    [persistSession]
  );

  const onProofResolved = useCallback(
    (payload: { outcome: 'success' | 'failure'; preview?: ZkProofPreview; errorMessage?: string }) => {
      const r = repo.trim();
      const p = pr.trim();
      setZkSubstep('result');
      if (payload.outcome === 'failure') {
        setZkOutcome('failure');
        setZkErrorMessage(payload.errorMessage ?? 'Proof generation failed.');
        setProofPreview(undefined);
        persistSession({
          repo: r,
          pr: p,
          zkSubstep: 'result',
          zkOutcome: 'failure',
          zkErrorMessage: payload.errorMessage,
          proofPreview: undefined,
        });
      } else if (payload.preview) {
        setZkOutcome('success');
        setZkErrorMessage(undefined);
        setProofPreview(payload.preview);
        persistSession({
          repo: r,
          pr: p,
          zkSubstep: 'result',
          zkOutcome: 'success',
          zkErrorMessage: undefined,
          proofPreview: payload.preview,
        });
      }
    },
    [persistSession, repo, pr]
  );

  const onZkTryAgain = useCallback(() => {
    const r = repo.trim();
    const p = pr.trim();
    setZkSubstep('loading');
    setZkOutcome(undefined);
    setZkErrorMessage(undefined);
    setProofPreview(undefined);
    setLoadingRunId((n) => n + 1);
    persistSession({
      repo: r,
      pr: p,
      zkSubstep: 'loading',
      zkOutcome: undefined,
      zkErrorMessage: undefined,
      proofPreview: undefined,
    });
  }, [persistSession, repo, pr]);

  const repoTrimmed = repo.trim();
  const prTrimmed = pr.trim();
  const repoValid = GITHUB_REPO_REGEX.test(repoTrimmed);
  const prValid = /^[1-9]\d*$/.test(prTrimmed);

  const repoError = touchedRepo && repoTrimmed.length > 0 && !repoValid;
  const prError = touchedPr && prTrimmed.length > 0 && !prValid;
  const canContinueStep1 = repoValid && prValid;

  const continueFromStep1ToProof = useCallback(() => {
    if (!canContinueStep1 || milestoneIndex === null || !storageKey) return;
    writeMilestoneSubmitSession(storageKey, {
      repo: repoTrimmed,
      pr: prTrimmed,
      savedAt: Date.now(),
      uiStep: 2,
      zkSubstep: 'loading',
      zkOutcome: undefined,
      zkErrorMessage: undefined,
      proofPreview: undefined,
    });
    setUiStep(2);
    setZkSubstep('loading');
    setZkOutcome(undefined);
    setZkErrorMessage(undefined);
    setProofPreview(undefined);
    setLoadingRunId((n) => n + 1);
    router.push(`${submitBasePath}/proof`);
  }, [
    canContinueStep1,
    milestoneIndex,
    storageKey,
    repoTrimmed,
    prTrimmed,
    router,
    submitBasePath,
  ]);

  const continueToSummary = useCallback(() => {
    const r = repoTrimmed;
    const p = prTrimmed;
    setUiStep(3);
    persistSession({ repo: r, pr: p, uiStep: 3 });
    router.push(`${submitBasePath}/summary`);
  }, [persistSession, prTrimmed, repoTrimmed, router, submitBasePath]);

  const backToProofFromSummary = useCallback(() => {
    const r = repoTrimmed;
    const p = prTrimmed;
    setUiStep(2);
    persistSession({
      repo: r,
      pr: p,
      uiStep: 2,
      writtenSummary: writtenSummary,
    });
    router.push(`${submitBasePath}/proof`);
  }, [persistSession, prTrimmed, repoTrimmed, router, submitBasePath, writtenSummary]);

  const continueToOnchain = useCallback(() => {
    if (writtenSummary.trim().length < 50) return;
    const r = repoTrimmed;
    const p = prTrimmed;
    const summary = writtenSummary.trim();
    setUiStep(4);
    persistSession({
      repo: r,
      pr: p,
      uiStep: 4,
      writtenSummary: summary,
    });
    router.push(`${submitBasePath}/onchain`);
  }, [
    persistSession,
    prTrimmed,
    repoTrimmed,
    router,
    submitBasePath,
    writtenSummary,
  ]);

  const regenerateProofAfterInvalidOnchain = useCallback(() => {
    const r = repoTrimmed;
    const p = prTrimmed;
    setUiStep(2);
    setZkSubstep('loading');
    setZkOutcome(undefined);
    setZkErrorMessage(undefined);
    setProofPreview(undefined);
    setLoadingRunId((n) => n + 1);
    persistSession({
      repo: r,
      pr: p,
      uiStep: 2,
      zkSubstep: 'loading',
      zkOutcome: undefined,
      zkErrorMessage: undefined,
      proofPreview: undefined,
      writtenSummary,
      aiVerdict: '',
      aiExplanation: '',
      aiVerifierId: '',
    });
    setAiSnapshotState(null);
    router.push(`${submitBasePath}/proof`);
  }, [
    persistSession,
    prTrimmed,
    repoTrimmed,
    router,
    submitBasePath,
    writtenSummary,
  ]);

  const displayTuple: GrantTuple | undefined = grantTuple;
  const displayMilestone =
    displayTuple && milestoneIndex !== null && milestoneIndex < displayTuple.milestones.length
      ? displayTuple.milestones[milestoneIndex]!
      : undefined;

  const deadlineMs =
    displayMilestone && Number(displayMilestone.deadline) > 0
      ? Number(displayMilestone.deadline) * 1000
      : null;
  const deadlineLabel =
    deadlineMs !== null
      ? new Date(deadlineMs).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

  const grantLabel =
    grantIdParsed !== undefined && grantIdParsed <= BigInt(Number.MAX_SAFE_INTEGER)
      ? grantIdParsed.toString()
      : grantIdParsed !== undefined
        ? grantIdParsed.toString(16)
        : '—';

  const grantHeaderSubtitle = `Grant #${grantLabel}`;

  const effectiveGrantId = grantIdParsed;

  const value: MilestoneSubmitContextValue = {
    gate,
    submitBasePath,
    routeGrantId,
    grantIdParsed,
    effectiveGrantId,
    milestoneIndex,
    isDemoRoute: false,
    storageKey,
    displayTuple,
    displayMilestone,
    grantLabel,
    grantHeaderSubtitle,
    deadlineLabel,
    registeredGithubHandle,
    repo,
    setRepo,
    pr,
    setPr,
    touchedRepo,
    setTouchedRepo,
    touchedPr,
    setTouchedPr,
    repoTrimmed,
    prTrimmed,
    repoValid,
    prValid,
    repoError,
    prError,
    canContinueStep1,
    persistSession,
    zkSubstep,
    setZkSubstep,
    loadingRunId,
    setLoadingRunId,
    zkOutcome,
    setZkOutcome,
    zkErrorMessage,
    setZkErrorMessage,
    proofPreview,
    setProofPreview,
    uiStep,
    setUiStep,
    onProofResolved,
    onZkTryAgain,
    continueFromStep1ToProof,
    continueToSummary,
    writtenSummary,
    setWrittenSummary,
    backToProofFromSummary,
    continueToOnchain,
    aiSnapshot,
    setAiSnapshot,
    regenerateProofAfterInvalidOnchain,
    submissionMeta,
    submitSessionReady,
    resolvedEscrowAddress,
  };

  return <MilestoneSubmitContext.Provider value={value}>{children}</MilestoneSubmitContext.Provider>;
}
