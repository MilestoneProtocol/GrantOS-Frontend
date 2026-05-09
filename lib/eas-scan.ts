/** Build EAS Scan URL for an attestation UID (default: Arbitrum deployment). */

export function easAttestationScanUrl(uid: string): string {
  const trimmed = uid.trim();
  if (!trimmed.startsWith('0x')) return '';
  const template =
    process.env.NEXT_PUBLIC_EAS_ATTESTATION_URL_TEMPLATE?.trim() ||
    'https://arbitrum.easscan.org/attestation/view/{uid}';
  return template.replace('{uid}', encodeURIComponent(trimmed));
}
