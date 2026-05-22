import { grantEscrowSubmitAbi } from '@/lib/grant-escrow-submit';
import { decodeErrorResult, type Hex } from 'viem';

export function isInvalidProofRevert(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/InvalidProof/i.test(msg)) return true;

  const data =
    err && typeof err === 'object' && 'cause' in err
      ? (err as { cause?: { data?: Hex } }).cause?.data
      : undefined;
  const direct =
    err && typeof err === 'object' && 'data' in err
      ? (err as { data?: Hex }).data
      : undefined;
  const hex = data ?? direct;
  if (!hex || typeof hex !== 'string') return false;
  try {
    const decoded = decodeErrorResult({
      abi: grantEscrowSubmitAbi,
      data: hex as Hex,
    });
    return decoded.errorName === 'InvalidProof';
  } catch {
    return false;
  }
}
