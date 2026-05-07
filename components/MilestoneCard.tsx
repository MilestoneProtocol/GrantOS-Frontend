'use client';

import { MilestoneInput } from '@/app/grants/new/store';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

type MilestoneCardProps = {
  index: number;
  milestone: MilestoneInput;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onChange: (patch: Partial<MilestoneInput>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

export default function MilestoneCard({
  index,
  milestone,
  canMoveUp,
  canMoveDown,
  canDelete,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: MilestoneCardProps) {
  return (
    <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {index + 1}
          </div>
          <h4 className="text-sm font-semibold text-slate-900">
            Milestone {index + 1}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
          placeholder="Title"
          value={milestone.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <textarea
          className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
          placeholder="Description"
          rows={3}
          value={milestone.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">USDC Amount</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={milestone.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Deadline</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-slate-300 focus:bg-white focus:outline-none"
              type="date"
              value={milestone.deadline}
              onChange={(e) => onChange({ deadline: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange({ proofType: 'zk_github' })}
            className={`rounded-2xl border px-4 py-3 text-xs font-semibold transition ${
              milestone.proofType === 'zk_github'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            ZK GitHub Proof Required
          </button>
          <button
            type="button"
            onClick={() => onChange({ proofType: 'eas_only' })}
            className={`rounded-2xl border px-4 py-3 text-xs font-semibold transition ${
              milestone.proofType === 'eas_only'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            EAS Evidence Only
          </button>
        </div>
      </div>
    </div>
  );
}
