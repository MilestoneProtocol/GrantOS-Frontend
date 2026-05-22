'use client';

import NotificationIcon from '@/components/notifications/NotificationIcon';
import { formatRelativeTimestamp } from '@/lib/notifications';
import type { AppNotification } from '@/store/notificationStore';

type NotificationHistoryCardProps = {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onNavigate: (n: AppNotification) => void;
};

export default function NotificationHistoryCard({
  notification,
  onMarkRead,
  onNavigate,
}: NotificationHistoryCardProps) {
  const timestampLabel = formatRelativeTimestamp(notification.timestamp);
  const absoluteTime = new Date(notification.timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
        notification.read ? 'border-slate-200' : 'border-blue-200/80 ring-1 ring-blue-100'
      }`}
    >
      {!notification.read ? (
        <span
          className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-blue-500 sm:-left-1.5"
          aria-hidden
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <NotificationIcon category={notification.category} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500">
                {notification.source}
              </span>
            </div>
            <time
              dateTime={new Date(notification.timestamp).toISOString()}
              className="shrink-0 text-xs text-slate-400 sm:text-right"
              title={absoluteTime}
            >
              {timestampLabel}
              <span className="mt-0.5 hidden text-[11px] text-slate-400 md:block">{absoluteTime}</span>
            </time>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">{notification.message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <button
              type="button"
              onClick={() => onNavigate(notification)}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              View details
            </button>
            {!notification.read ? (
              <button
                type="button"
                onClick={() => onMarkRead(notification.id)}
                className="text-slate-500 hover:text-slate-800 hover:underline"
              >
                Mark read
              </button>
            ) : null}
            <span className="text-xs text-slate-400">
              Event: <span className="font-mono">{notification.type.replace(/_/g, ' ')}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
