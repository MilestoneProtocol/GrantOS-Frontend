'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Width breakpoint at which the drawer should auto-close (matches the breakpoint where the desktop sidebar takes over). Defaults to 1024px. */
  autoCloseAt?: number;
  /** Side the drawer slides in from. */
  side?: 'left' | 'right';
  /** Accessible label for the dialog. */
  ariaLabel?: string;
  /** Optional header rendered at the top of the drawer (logo, etc.). */
  header?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Slide-in drawer used for mobile + tablet navigation across the app.
 *
 * - Portaled into `document.body` so it always renders above app chrome.
 * - Locks page scroll while open.
 * - Closes on ESC, on backdrop click, and when the viewport widens past
 *   `autoCloseAt` (so the user is never left with a stale drawer after
 *   rotating into landscape / resizing to desktop).
 */
export default function MobileNavDrawer({
  open,
  onClose,
  autoCloseAt = 1024,
  side = 'left',
  ariaLabel = 'Navigation',
  header,
  children,
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!open) return;

    lastFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const t = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const onResize = () => {
      if (window.innerWidth >= autoCloseAt) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(t);
      body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose, autoCloseAt]);

  if (typeof window === 'undefined') return null;
  if (!open) return null;

  const sideStyles =
    side === 'left'
      ? 'left-0 border-r border-slate-200/80'
      : 'right-0 border-l border-slate-200/80';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 lg:hidden"
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none"
      />
      <div
        ref={panelRef}
        className={`absolute top-0 ${sideStyles} flex h-dvh w-[86vw] max-w-[320px] flex-col bg-white shadow-2xl outline-none transition-transform duration-200 ease-out motion-reduce:transition-none`}
        style={{
          transform: 'translateX(0)',
          animation: `grantos-drawer-${side}-in 220ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
