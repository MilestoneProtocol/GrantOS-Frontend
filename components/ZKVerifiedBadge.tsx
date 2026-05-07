import { Check } from 'lucide-react';

type ZKVerifiedBadgeProps = {
  verified: boolean;
};

export default function ZKVerifiedBadge({ verified }: ZKVerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
        verified
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {verified ? (
        <Check className="h-4 w-4" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      )}
      {verified ? 'ZK Verified' : 'Not Verified'}
    </span>
  );
}
