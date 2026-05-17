'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import DaoAppShell from '@/components/dao/DaoAppShell';
import NotificationHistoryCard from '@/components/notifications/NotificationHistoryCard';
import { groupNotificationsByDate, resolveFallbackRole } from '@/lib/notifications';
import { useAuthGuard } from '@/lib/authGuard';
import { useRoleDetection } from '@/lib/roleDetection';
import {
  selectNotificationsForRole,
  selectUnreadForRole,
  useNotificationStore,
  type AppNotification,
  type NotificationCategory,
  type NotificationFilter,
  type NotificationRole,
} from '@/store/notificationStore';
import { Check, ChevronDown, Filter, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

const FILTER_CHIPS: { id: NotificationFilter; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'milestone', label: 'Milestones', dot: 'bg-blue-500' },
  { id: 'deadline', label: 'Deadlines', dot: 'bg-amber-500' },
  { id: 'approval', label: 'Approvals', dot: 'bg-emerald-500' },
];

function NotificationsMain({ viewRole }: { viewRole: NotificationRole }) {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearRead = useNotificationStore((s) => s.clearRead);

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [moreOpen, setMoreOpen] = useState(false);
  const [extraCategory, setExtraCategory] = useState<NotificationCategory | null>(null);

  const roleNotifications = selectNotificationsForRole(notifications, viewRole);
  const unreadCount = selectUnreadForRole(notifications, viewRole);

  const filtered = useMemo(() => {
    let list = roleNotifications;
    if (filter === 'unread') list = list.filter((n) => !n.read);
    else if (filter !== 'all') list = list.filter((n) => n.category === filter);
    if (extraCategory) list = list.filter((n) => n.category === extraCategory);
    return list;
  }, [extraCategory, filter, roleNotifications]);

  const groups = useMemo(() => groupNotificationsByDate(filtered), [filtered]);

  const handleNavigate = (n: AppNotification) => {
    markAsRead(n.id);
    router.push(n.href);
  };

  const unreadChipLabel = unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread';

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Notification History
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Manage and view all your grant-related alerts.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200 disabled:opacity-40"
          >
            <Check className="h-4 w-4" aria-hidden />
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => clearRead()}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Clear read
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.id && !extraCategory;
          const label = chip.id === 'unread' ? unreadChipLabel : chip.label;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setFilter(chip.id);
                setExtraCategory(null);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {chip.dot ? <span className={`h-2 w-2 rounded-full ${chip.dot}`} aria-hidden /> : null}
              {label}
            </button>
          );
        })}

        <div className="relative ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            More filters
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(['warning', 'treasury', 'system'] as NotificationCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setExtraCategory(cat);
                    setFilter('all');
                    setMoreOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm capitalize text-slate-700 hover:bg-slate-50"
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {extraCategory ? (
        <p className="mt-3 text-xs text-slate-500">
          Filtering by <span className="font-medium capitalize">{extraCategory}</span>
          <button
            type="button"
            onClick={() => setExtraCategory(null)}
            className="ml-2 text-blue-600 hover:underline"
          >
            Clear
          </button>
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No notifications match this filter.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map((n) => (
                  <NotificationHistoryCard
                    key={n.id}
                    notification={n}
                    onMarkRead={markAsRead}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

export default function NotificationsPage() {
  const { isConnected } = useAccount();
  const roles = useRoleDetection();
  const setActiveRole = useNotificationStore((s) => s.setActiveRole);
  const storeRole = useNotificationStore((s) => s.activeRole);

  const viewRole = useMemo<NotificationRole>(() => {
    if (!roles.loading) return resolveFallbackRole(roles);
    return storeRole;
  }, [roles, storeRole]);

  useEffect(() => {
    if (!roles.loading && isConnected) {
      setActiveRole(viewRole);
    }
  }, [isConnected, roles.loading, setActiveRole, viewRole]);

  const guard = useAuthGuard(isConnected ? viewRole : 'public');

  if (!isConnected) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-slate-500">
        Connect your wallet to view notifications.
      </main>
    );
  }

  if (guard.state === 'loading' || roles.loading) {
    const loading = (
      <main className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading…
      </main>
    );
    if (viewRole === 'builder') {
      return <BuilderAppShell navActive="none">{loading}</BuilderAppShell>;
    }
    if (viewRole === 'dao') {
      return <DaoAppShell breadcrumb="Notifications">{loading}</DaoAppShell>;
    }
    return <CommitteeAppShell breadcrumb="Notifications">{loading}</CommitteeAppShell>;
  }

  if (guard.state === 'blocked') {
    return (
      <main className="flex min-h-[40vh] items-center justify-center px-4 text-center text-sm text-slate-500">
        You don&apos;t have access to notifications for this role.
      </main>
    );
  }

  if (viewRole === 'builder') {
    return (
      <BuilderAppShell navActive="none">
        <NotificationsMain viewRole={viewRole} />
      </BuilderAppShell>
    );
  }

  if (viewRole === 'dao') {
    return (
      <DaoAppShell breadcrumb="Notifications">
        <NotificationsMain viewRole={viewRole} />
      </DaoAppShell>
    );
  }

  return (
    <CommitteeAppShell breadcrumb="Notifications">
      <NotificationsMain viewRole={viewRole} />
    </CommitteeAppShell>
  );
}
