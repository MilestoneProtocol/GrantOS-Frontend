import { keccak256, stringToBytes } from 'viem';

export type ZkProofPreview = {
  prTitle: string;
  merged: boolean;
  authorLogin: string;
  branch: string;
  mergedAtIso: string;
  proofHash: `0x${string}`;
  identityMatches: boolean;
};

export type MilestoneSubmitPersisted = {
  repo: string;
  pr: string;
  savedAt: number;
  /** 1 = Milestone Context … 4 = Onchain */
  uiStep: 1 | 2 | 3 | 4;
  zkSubstep?: 'loading' | 'result';
  zkOutcome?: 'success' | 'failure';
  zkErrorMessage?: string;
  proofPreview?: ZkProofPreview;
  /** Builder-written summary for committee (step 3). */
  writtenSummary?: string;
  /** Cached AI verdict from step 3 (for step 4 review / EAS payload). */
  aiVerdict?: string;
  aiExplanation?: string;
  aiVerifierId?: string;
  /** Set after onchain milestone tx confirms — drives success screen. */
  submissionCompletedAt?: number;
  submissionTxHash?: string;
  submissionEasUid?: string;
};

export type MilestoneSubmissionSuccessMeta = {
  completedAt: number;
  txHash: string;
  easUid?: string;
};

export function milestoneSubmitStorageKey(
  isDemoRoute: boolean,
  grantIdParsed: bigint | undefined,
  milestoneIndex: number | null
): string | null {
  if (milestoneIndex === null) return null;
  if (isDemoRoute) return `grantos-milestone-submit-ui-demo-${milestoneIndex}`;
  if (grantIdParsed === undefined) return null;
  return `grantos-milestone-submit-${grantIdParsed.toString()}-${milestoneIndex}`;
}

export function readMilestoneSubmitSession(raw: string | null): MilestoneSubmitPersisted | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as MilestoneSubmitPersisted;
    if (typeof v.repo !== 'string' || typeof v.pr !== 'string') return null;
    if (!v.uiStep || v.uiStep < 1 || v.uiStep > 4) {
      return { ...v, uiStep: 1 };
    }
    return v;
  } catch {
    return null;
  }
}

export function writeMilestoneSubmitSession(key: string, data: MilestoneSubmitPersisted) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Normalize GitHub login for comparison (registry & PR author). */
export function normalizeGithubHandle(s: string): string {
  return s.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Mock proof outcome for UI until vlayer is wired.
 * - Append `zk-fail-demo` to repo owner/repo → generation failure.
 * - Append `mismatch-demo` → PR author ≠ registry (if registry set).
 */
export function buildMockZkProofResult(
  repo: string,
  pr: string,
  registeredGithubFromRegistry: string
): { kind: 'success'; preview: ZkProofPreview } | { kind: 'failure'; message: string } {
  const lowerRepo = repo.toLowerCase();
  if (lowerRepo.includes('zk-fail-demo')) {
    return {
      kind: 'failure',
      message:
        'Repository is private or PR not found. Ensure the vlayer Prover has read access to the target repository.',
    };
  }

  const reg = normalizeGithubHandle(registeredGithubFromRegistry);
  const forceMismatch = lowerRepo.includes('mismatch-demo');
  const authorLogin = forceMismatch ? 'foreign-contributor' : reg || 'unknown-author';
  const identityMatches = Boolean(reg) && normalizeGithubHandle(authorLogin) === reg;

  const slug = repo.includes('/') ? repo.split('/')[1] || 'repo' : 'repo';
  const prTitle = `feat(${slug}): deliver milestone scope with tests and integration`;
  const mergedAt = new Date();
  const proofSeed = `${repo}:${pr}:${mergedAt.getTime()}`;
  const proofHash = keccak256(stringToBytes(proofSeed)) as `0x${string}`;

  return {
    kind: 'success',
    preview: {
      prTitle,
      merged: true,
      authorLogin: authorLogin.startsWith('@') ? authorLogin : `@${authorLogin}`,
      branch: 'main',
      mergedAtIso: mergedAt.toISOString(),
      proofHash,
      identityMatches,
    },
  };
}
