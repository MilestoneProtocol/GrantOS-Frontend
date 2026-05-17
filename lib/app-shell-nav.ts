import type { LucideIcon } from 'lucide-react';

export type AppShellNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Reserved for optional header pills — role surfaces use sidebar nav instead. */
export const APP_SHELL_PRIMARY_LINKS: AppShellNavItem[] = [];
