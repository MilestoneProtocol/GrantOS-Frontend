'use client';

import { BookMarked, LayoutDashboard, Wallet } from 'lucide-react';
import SettingsGearIcon from '@/components/SettingsGearIcon';
import Link from 'next/link';
import { useAccount } from 'wagmi';

export const DAO_NAV_ITEMS = [
  { label: 'DAO Dashboard', href: '/dao', icon: LayoutDashboard },
  { label: 'Treasury', href: '/treasury', icon: Wallet },
  { label: 'Guidelines', href: '/dao/guidelines', icon: BookMarked },
] as const;

type DaoSidebarContentProps = {
  pathname: string | null;
  variant?: 'full' | 'rail';
  onNavigate?: () => void;
};

function isItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === '/dao') return pathname === '/dao';
  if (href === '/treasury') return pathname === '/treasury' || pathname.startsWith('/treasury/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DaoSidebarContent({
  pathname,
  variant = 'full',
  onNavigate,
}: DaoSidebarContentProps) {
  const { isConnected } = useAccount();
  const isRail = variant === 'rail';

  const linkClass = (active: boolean) =>
    isRail
      ? `group relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
          active
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      : `group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
          active
            ? 'bg-slate-900 font-semibold text-white'
            : 'font-medium text-slate-700 hover:bg-slate-100'
        }`;

  return (
    <div className={`flex h-full flex-col ${isRail ? 'w-full' : ''}`}>
      {!isRail ? (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          DAO Admin
        </p>
      ) : null}

      <nav
        aria-label={isRail ? 'DAO navigation rail' : 'DAO navigation'}
        className={isRail ? 'flex flex-col items-center gap-1.5' : 'flex-1'}
      >
        {isRail ? (
          <>
          {DAO_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isItemActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-label={label}
                title={label}
                className={linkClass(active)}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
            );
          })}
          </>
        ) : (
          <>
          <ul className="space-y-1">
            {DAO_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = isItemActive(href, pathname);
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} className={linkClass(active)}>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </nav>

      <div
        className={`mt-auto border-t border-slate-100 pt-3 ${
          isRail ? 'flex flex-col items-center' : ''
        }`}
      >
        {isConnected ? <SettingsGearIcon variant={variant} /> : null}
      </div>
    </div>
  );
}
