import { ShieldCheck } from 'lucide-react';

type ReputationBadgeProps = {
  score: number;
  letterGrade: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  zkVerified?: boolean;
};

export default function ReputationBadge({
  score,
  letterGrade,
  size = 'md',
  showLabel = true,
  zkVerified = false,
}: ReputationBadgeProps) {
  const gradeColor =
    letterGrade === 'A'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : letterGrade === 'B'
        ? 'bg-sky-50 text-sky-700 ring-sky-200'
        : letterGrade === 'C'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : letterGrade === 'D'
            ? 'bg-orange-50 text-orange-700 ring-orange-200'
            : 'bg-red-50 text-red-700 ring-red-200';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-bold ring-1 ring-inset ${gradeColor} ${sizeClasses[size]}`}
      title={`Reputation Score: ${score}/100`}
    >
      {zkVerified && <ShieldCheck className={iconSize[size]} />}
      <span>{letterGrade}</span>
      {showLabel && (
        <>
          <span className="opacity-50">·</span>
          <span>{score}</span>
        </>
      )}
    </div>
  );
}
