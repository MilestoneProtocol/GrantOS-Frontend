import { AlertTriangle, ClipboardList } from 'lucide-react';

type CommitteeActionsHeaderProps = {
  overdueCount: number;
  pendingReviewCount: number;
};

/**
 * Page title + the two top-right stat cards on the Committee Actions surface.
 * The stat cards are deliberately compact (icon + label + count) — they act as
 * a quick-glance summary above the detailed sections below.
 */
export default function CommitteeActionsHeader({
  overdueCount,
  pendingReviewCount,
}: CommitteeActionsHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pending Milestones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and manage milestones requiring committee action.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-stretch gap-3">
        <StatCard
          tone="overdue"
          icon={<AlertTriangle className="h-4 w-4" strokeWidth={2.4} aria-hidden />}
          label="Overdue"
          value={overdueCount}
        />
        <StatCard
          tone="review"
          icon={<ClipboardList className="h-4 w-4" strokeWidth={2.2} aria-hidden />}
          label="Pending Review"
          value={pendingReviewCount}
        />
      </div>
    </header>
  );
}

function StatCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: 'overdue' | 'review';
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const iconClass =
    tone === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="font-mono text-xl font-bold tabular-nums leading-none text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}
