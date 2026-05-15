'use client';

import NotificationIcon from '@/components/notifications/NotificationIcon';
import { formatRelativeTimestamp } from '@/lib/notifications';
import {
  selectNotificationsForRole,
  selectUnreadForRole,
  useNotificationStore,
  type AppNotification,
} from '@/store/notificationStore';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

function DropdownNotificationRow({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate: (n: AppNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(notification)}
      className={`relative flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 ${
        !notification.read ? 'bg-blue-50/40' : ''
      }`}
    >
      {!notification.read ? (
        <span
          className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rounded-full bg-blue-500"
          aria-hidden
        />
      ) : null}
      <NotificationIcon category={notification.category} className="h-9 w-9" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900">{notification.title}</span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {notification.message}
        </span>
        <span className="mt-1 block text-[11px] text-slate-400">
          {formatRelativeTimestamp(notification.timestamp)}
        </span>
      </span>
    </button>
  );
}

function PanelContent({
  preview,
  unreadCount,
  onNavigate,
  onMarkAll,
  onClose,
  showClose,
}: {
  preview: AppNotification[];
  unreadCount: number;
  onNavigate: (n: AppNotification) => void;
  onMarkAll: () => void;
  onClose: () => void;
  showClose: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="max-h-[min(60vh,360px)] flex-1 overflow-y-auto">
        {preview.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 px-1 py-1">
            {preview.map((n) => (
              <DropdownNotificationRow key={n.id} notification={n} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onMarkAll}
          disabled={unreadCount === 0}
          className="text-xs font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
        >
          Mark all as read
        </button>
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>
    </>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const isMobileSheet = useIsMobileSheet();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeRole = useNotificationStore((s) => s.activeRole);
  const notifications = useNotificationStore((s) => s.notifications);
  const badgePulse = useNotificationStore((s) => s.badgePulse);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const acknowledgeBadgePulse = useNotificationStore((s) => s.acknowledgeBadgePulse);

  const roleNotifications = selectNotificationsForRole(notifications, activeRole);
  const unreadCount = selectUnreadForRole(notifications, activeRole);
  const preview = roleNotifications.slice(0, 8);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [close, open]);

  useEffect(() => {
    if (open && badgePulse) acknowledgeBadgePulse();
  }, [acknowledgeBadgePulse, badgePulse, open]);

  const handleNavigate = (n: AppNotification) => {
    markAsRead(n.id);
    close();
    router.push(n.href);
  };

  const panelProps = {
    preview,
    unreadCount,
    onNavigate: handleNavigate,
    onMarkAll: markAllAsRead,
    onClose: close,
    showClose: isMobileSheet,
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 sm:h-10 sm:w-10"
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {unreadCount > 0 ? (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${
              badgePulse ? 'animate-notification-badge' : ''
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open && !isMobileSheet ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <PanelContent {...panelProps} />
        </div>
      ) : null}

      {open && isMobileSheet ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
            aria-hidden
            onClick={close}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85vh,520px)] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <PanelContent {...panelProps} />
          </div>
        </>
      ) : null}
    </div>
  );
}
