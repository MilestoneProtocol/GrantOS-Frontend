'use client';

import { BUILDER_TOAST_MESSAGES } from '@/lib/builder-toast';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function BuilderDashboardToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toastKey = searchParams.get('toast');
  const message = toastKey ? (BUILDER_TOAST_MESSAGES[toastKey] ?? '') : '';

  useEffect(() => {
    if (!toastKey || !message) return;
    const hide = window.setTimeout(() => {
      router.replace('/dashboard');
    }, 4000);
    return () => window.clearTimeout(hide);
  }, [toastKey, message, router]);

  if (!toastKey || !message) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-20 z-50 mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg sm:inset-x-auto sm:right-6 sm:left-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button
          type="button"
          onClick={() => {
            router.replace('/dashboard');
          }}
          className="shrink-0 rounded-lg p-1 text-red-700 hover:bg-red-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
