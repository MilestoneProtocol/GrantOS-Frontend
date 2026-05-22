import { Check } from 'lucide-react';

/**
 * Compact ZK Verified inline badge — a small filled-blue check mark,
 * matching the inline marker shown next to builder addresses in the
 * Treasury Command Center design.
 */
export function ZKVerifiedDot({ verified }: { verified: boolean }) {
  if (!verified) {
    return (
      <span
        title="Not verified"
        aria-label="Not verified"
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200"
      />
    );
  }
  return (
    <span
      title="ZK Verified"
      aria-label="ZK Verified"
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm"
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
