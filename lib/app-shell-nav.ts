import type { LucideIcon } from 'lucide-react';
import { Landmark, LayoutDashboard, Settings } from 'lucide-react';

export type AppShellNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Primary header nav — shared by `AppShellHeader` and mobile bottom nav on the committee grant wizard (`/grants/new`). */
export const APP_SHELL_PRIMARY_LINKS: AppShellNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Treasury', href: '/#treasury', icon: Landmark },
  { label: 'Settings', href: '/#settings', icon: Settings },
];
