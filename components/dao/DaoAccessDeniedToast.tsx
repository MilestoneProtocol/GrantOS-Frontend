import { AlertTriangle } from 'lucide-react';

/**
 * Inline "Access Denied" toast rendered on the DAO routes when the
 * connected wallet is not a DAO admin. Shown briefly over the skeleton
 * before the page redirects to `/`, matching the unauthorized-state design.
 */
export default function DaoAccessDeniedToast() {
  return (
    <div
      role="alert"
      className="pointer-events-none fixed right-4 top-20 z-50 w-[min(22rem,calc(100vw-2rem))] animate-toast-in"
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-red-600">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-900">Access Denied</p>
          <p className="mt-0.5 text-xs leading-relaxed text-red-800">
            You are not a DAO admin.
          </p>
        </div>
      </div>
    </div>
  );
}
