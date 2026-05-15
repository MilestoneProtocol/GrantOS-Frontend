'use client';

import GuidelinesNavButton from '@/components/sidebar/GuidelinesNavButton';
import SettingsGearIcon from '@/components/SettingsGearIcon';
import { useAccount } from 'wagmi';

type SidebarUtilityFooterProps = {
  variant?: 'full' | 'rail';
  onNavigate?: () => void;
  className?: string;
};

/**
 * Bottom-of-sidebar utility strip — single source of truth for Guidelines + Settings.
 * Guidelines: all users (including unauthenticated on public pages).
 * Settings gear: connected wallets only (opens the global settings modal).
 */
export default function SidebarUtilityFooter({
  variant = 'full',
  onNavigate,
  className = '',
}: SidebarUtilityFooterProps) {
  const { isConnected } = useAccount();
  const isRail = variant === 'rail';

  return (
    <div
      className={`border-t border-slate-100 pt-3 dark:border-slate-800 ${
        isRail ? 'flex flex-col items-center gap-2' : 'space-y-2'
      } ${className}`}
    >
      {!isRail ? (
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Reference
        </p>
      ) : null}
      <GuidelinesNavButton variant={variant} onNavigate={onNavigate} />
      {isConnected ? <SettingsGearIcon variant={variant} /> : null}
    </div>
  );
}
