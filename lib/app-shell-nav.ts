import type { LucideIcon } from 'lucide-react';
import { BookMarked, Landmark, LayoutDashboard } from 'lucide-react';

export type AppShellNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Primary header nav — shared by `AppShellHeader` and mobile bottom nav on the committee grant wizard (`/grants/new`). */
export const APP_SHELL_PRIMARY_LINKS: AppShellNavItem[] = [
  { label: 'Dashboard', href: '/builder', icon: LayoutDashboard },
  { label: 'Treasury', href: '/#treasury', icon: Landmark },
  { label: 'Guidelines', href: '/guidelines', icon: BookMarked },
];
