'use client';

import type { NotificationCategory } from '@/store/notificationStore';
import { AlertTriangle, Check, Clock, Flag, Landmark, Link2 } from 'lucide-react';

type NotificationIconProps = {
  category: NotificationCategory;
  className?: string;
};

const STYLES: Record<NotificationCategory, { bg: string; icon: typeof Flag }> = {
  milestone: { bg: 'bg-blue-100 text-blue-600', icon: Flag },
  deadline: { bg: 'bg-amber-100 text-amber-600', icon: Clock },
  approval: { bg: 'bg-emerald-100 text-emerald-600', icon: Check },
  warning: { bg: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
  treasury: { bg: 'bg-violet-100 text-violet-600', icon: Landmark },
  system: { bg: 'bg-slate-100 text-slate-600', icon: Link2 },
};

export default function NotificationIcon({ category, className = '' }: NotificationIconProps) {
  const style = STYLES[category] ?? STYLES.system;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg} ${className}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </span>
  );
}
