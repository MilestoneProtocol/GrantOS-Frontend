/** Parse grant id from URL segment: decimal, hex, or GRT-YYYY-<suffix>. */
export function parseGrantIdFromPath(raw: string): bigint | undefined {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed) return undefined;

  let s = trimmed;
  const grit = /^GRT-\d{4}-(.+)$/i.exec(s);
  if (grit) s = grit[1]!;

  if (/^\d+$/.test(s)) {
    try {
      return BigInt(s);
    } catch {
      return undefined;
    }
  }

  const hex = s.startsWith('0x') || s.startsWith('0X') ? s : `0x${s}`;
  try {
    if (/^0x[0-9a-f]*$/i.test(hex) && hex.length > 2) return BigInt(hex);
  } catch {
    /* fallthrough */
  }
  return undefined;
}
