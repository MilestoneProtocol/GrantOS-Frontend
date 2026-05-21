const REQUEST_ID_KEY = 'grantos:identity-verify:requestId';
const WALLET_PREFIX = 'grantos:identity-verify:wallet:';
const ATTESTATION_PREFIX = 'grantos:identity-verify:attestation:';
const ZK_PROOF_PREFIX = 'grantos:identity-verify:zkproof:';
const ZK_INPUTS_PREFIX = 'grantos:identity-verify:zkpubinputs:';

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined';
}

export function persistVerifyRequestId(requestId: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(REQUEST_ID_KEY, requestId);
}

export function readVerifyRequestId(): string | null {
  if (!canUseSessionStorage()) return null;
  return sessionStorage.getItem(REQUEST_ID_KEY);
}

export function persistVerifyWallet(requestId: string, wallet: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(`${WALLET_PREFIX}${requestId}`, wallet.toLowerCase());
}

export function readVerifyWallet(requestId: string): string | null {
  if (!canUseSessionStorage()) return null;
  return sessionStorage.getItem(`${WALLET_PREFIX}${requestId}`);
}

export function persistVerifyAttestation(requestId: string, data: unknown): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(`${ATTESTATION_PREFIX}${requestId}`, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function readVerifyAttestation<T>(requestId: string): T | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(`${ATTESTATION_PREFIX}${requestId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function persistZkProof(requestId: string, proof: Uint8Array, publicInputs: string[]): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(`${ZK_PROOF_PREFIX}${requestId}`, JSON.stringify(Array.from(proof)));
    sessionStorage.setItem(`${ZK_INPUTS_PREFIX}${requestId}`, JSON.stringify(publicInputs));
  } catch {
    /* quota */
  }
}

export function readZkProof(requestId: string): { proof: Uint8Array; publicInputs: string[] } | null {
  if (!canUseSessionStorage()) return null;
  try {
    const proofRaw = sessionStorage.getItem(`${ZK_PROOF_PREFIX}${requestId}`);
    const inputsRaw = sessionStorage.getItem(`${ZK_INPUTS_PREFIX}${requestId}`);
    if (!proofRaw || !inputsRaw) return null;
    return {
      proof: new Uint8Array(JSON.parse(proofRaw)),
      publicInputs: JSON.parse(inputsRaw) as string[],
    };
  } catch {
    return null;
  }
}

export function clearZkProofOnly(requestId: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(`${ZK_PROOF_PREFIX}${requestId}`);
  sessionStorage.removeItem(`${ZK_INPUTS_PREFIX}${requestId}`);
  sessionStorage.removeItem(`zkproof:${requestId}`);
  sessionStorage.removeItem(`zkpubinputs:${requestId}`);
}

export function clearVerifySession(requestId: string): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(REQUEST_ID_KEY);
  sessionStorage.removeItem(`${WALLET_PREFIX}${requestId}`);
  sessionStorage.removeItem(`${ATTESTATION_PREFIX}${requestId}`);
  sessionStorage.removeItem(`${ZK_PROOF_PREFIX}${requestId}`);
  sessionStorage.removeItem(`${ZK_INPUTS_PREFIX}${requestId}`);
  // Legacy keys from earlier builds
  sessionStorage.removeItem(`zkproof:${requestId}`);
  sessionStorage.removeItem(`zkpubinputs:${requestId}`);
}
