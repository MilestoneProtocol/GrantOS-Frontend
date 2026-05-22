'use client';

type ReverifyIdentityModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ReverifyIdentityModal({
  open,
  onCancel,
  onConfirm,
}: ReverifyIdentityModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reverify-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="reverify-title" className="text-lg font-bold text-slate-900">
          Re-verify identity?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Re-verifying will overwrite your existing identity binding. Your reputation score and
          grant history will remain unchanged. Continue?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
