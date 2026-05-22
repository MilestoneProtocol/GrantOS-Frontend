/** Max factory grants to scan in a single multicall batch. */
export const MAX_FACTORY_GRANT_INDEX = 256;

/**
 * Coerce on-chain `grantCount` into a safe array length.
 * Bogus reads from placeholder contracts must not blow `Array.from`.
 */
export function safeFactoryGrantCount(raw: bigint | null | undefined): number {
  if (raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_FACTORY_GRANT_INDEX) return 0;
  return Math.floor(n);
}

export function factoryIndexRange(count: number): bigint[] {
  const safe = safeFactoryGrantCount(BigInt(count));
  if (safe <= 0) return [];
  return Array.from({ length: safe }, (_, i) => BigInt(i));
}
