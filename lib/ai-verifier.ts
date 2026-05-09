/** Shared types for POST `/api/ai-verifier` (milestone summary step). */

export type AiVerifierVerdict = 'LIKELY_FULFILLED' | 'UNCERTAIN' | 'LIKELY_INSUFFICIENT';

/** Preferred payload (ZK verified flag). Legacy clients may still send `zkProofResult`. */
export type AiVerifierRequestBody = {
  milestoneDescription: string;
  prUrl: string;
  zkVerified: boolean;
};

export type AiVerifierSuccessBody = {
  verdict: AiVerifierVerdict;
  explanation: string;
  id?: string;
};
