'use client';

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutVariant = 'info' | 'warning' | 'critical';

const VARIANT_STYLES: Record<
  CalloutVariant,
  { border: string; bg: string; icon: string; Icon: typeof Info }
> = {
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/90 dark:bg-blue-950/35',
    icon: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/90 dark:bg-amber-950/35',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50/90 dark:bg-red-950/35',
    icon: 'text-red-600 dark:text-red-400',
    Icon: AlertCircle,
  },
};

type GuidelinesCalloutProps = {
  variant: CalloutVariant;
  title: string;
  children: ReactNode;
};

export default function GuidelinesCallout({ variant, title, children }: GuidelinesCalloutProps) {
  const styles = VARIANT_STYLES[variant];
  const { Icon } = styles;

  return (
    <aside
      className={`guidelines-callout flex gap-3 rounded-xl border border-slate-200/80 border-l-4 px-4 py-3.5 max-sm:flex-col sm:gap-4 sm:px-5 sm:py-4 dark:border-slate-700/80 ${styles.border} ${styles.bg}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 sm:mt-1 ${styles.icon}`}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-base sm:leading-relaxed">
        <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
        <div>{children}</div>
      </div>
    </aside>
  );
}
