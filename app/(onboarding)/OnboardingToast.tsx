'use client';

import { BUILDER_TOAST_MESSAGES } from '@/lib/builder-toast';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export default function OnboardingToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const toastKey = searchParams.get('toast');
  const message = useMemo(() => {
    if (!toastKey) return '';
    const explicit = searchParams.get('m');
    if (explicit) return explicit;
    return BUILDER_TOAST_MESSAGES[toastKey] ?? '';
  }, [searchParams, toastKey]);

  useEffect(() => {
    if (!toastKey || !message) return;
    const hide = window.setTimeout(() => {
      router.replace('/');
    }, 4500);
    return () => window.clearTimeout(hide);
  }, [message, router, toastKey]);

  if (!toastKey || !message) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg sm:inset-x-auto sm:right-6 sm:left-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button
          type="button"
          onClick={() => router.replace('/')}
          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

