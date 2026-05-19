'use client';

import { useSlashCounter } from '@/hooks/useSlashCounter';
import { Zap, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LiveSlashCounterProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact' | 'large';
}

/**
 * Live slash counter that auto-refreshes every 15 seconds.
 * Shows total number of slashed milestones across the platform.
 */
export function LiveSlashCounter({
  className = '',
  showLabel = true,
  variant = 'default',
}: LiveSlashCounterProps) {
  const count = useSlashCounter();
  const [prevCount, setPrevCount] = useState(count);
  const [isIncreasing, setIsIncreasing] = useState(false);

  useEffect(() => {
    if (count > prevCount) {
      setIsIncreasing(true);
      const timer = setTimeout(() => setIsIncreasing(false), 2000);
      setPrevCount(count);
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <Zap className="h-4 w-4 text-red-500" />
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
          {count}
        </span>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Slashes</p>
            <p className={`mt-2 font-mono text-4xl font-bold tabular-nums text-slate-900 transition-colors ${isIncreasing ? 'text-red-600' : ''}`}>
              {count}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Zap className="h-6 w-6 text-red-600" />
          </div>
        </div>
        {isIncreasing && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-red-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Just updated
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm ${className}`}>
      <Zap className="h-4 w-4 text-red-500" />
      {showLabel && (
        <span className="text-sm font-medium text-slate-600">Slashes:</span>
      )}
      <span className={`font-mono text-sm font-bold tabular-nums transition-colors ${isIncreasing ? 'text-red-600' : 'text-slate-900'}`}>
        {count}
      </span>
    </div>
  );
}

/**
 * Slash counter badge for dashboard headers.
 */
export function SlashCounterBadge({ className = '' }: { className?: string }) {
  const count = useSlashCounter();

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 ${className}`}>
      <Zap className="h-3.5 w-3.5 text-red-600" />
      <span className="font-mono text-xs font-bold tabular-nums text-red-700">
        {count}
      </span>
      <span className="text-xs font-medium text-red-700">slashed</span>
    </div>
  );
}
