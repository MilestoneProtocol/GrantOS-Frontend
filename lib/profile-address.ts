import { getAddress, type Address } from 'viem';

/**
 * Normalize a route segment into a checksummed address.
 * Accepts lowercase URLs; rejects wrong-length hex (common in demo fixtures).
 */
export function parseProfileAddress(raw: string): Address | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('0x')) return null;
  const hex = trimmed.slice(2);
  if (hex.length !== 40 || !/^[a-fA-F0-9]+$/.test(hex)) return null;
  try {
    return getAddress(trimmed) as Address;
  } catch {
    return null;
  }
}

export function builderProfilePath(raw: string): string | null {
  const address = parseProfileAddress(raw);
  return address ? `/builders/${address}` : null;
}
