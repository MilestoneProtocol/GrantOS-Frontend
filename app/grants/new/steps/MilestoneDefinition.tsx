'use client';

import { MilestoneInput, ProofType } from '@/app/grants/new/store';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  GripVertical,
  Info,
  Lock,
  Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const MAX_MILESTONES = 10;

const PROOF_HELP: Record<ProofType, string> = {
  zk_github:
    'Requires automated ZK proof of merged PRs to specified repository.',
  eas_only: 'Requires manual attestation via Ethereum Attestation Service.',
};

type MilestoneDefinitionProps = {
  milestones: MilestoneInput[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<MilestoneInput>) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
};

function UsdcAdornment() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs font-semibold text-slate-500">
      <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path
          fill="#fff"
          d="M20.5 18.2c0-1.9-1.1-2.7-3.4-3-1.6-.2-2-.5-2-.9 0-.5.4-.8 1.4-.8 1.1 0 1.5.3 1.8 1 .1.2.3.4.6.4h1.5c.4 0 .6-.3.5-.7-.3-1.6-1.6-2.6-3.6-2.9v-1.7c0-.3-.2-.5-.6-.6h-1.2c-.3 0-.5.2-.6.6v1.6c-2.2.4-3.6 1.6-3.6 3.4 0 1.8 1.1 2.6 3.4 2.9 1.7.2 2 .5 2 1 0 .6-.5.9-1.6.9-1.3 0-1.7-.3-2-1.1-.1-.3-.3-.4-.6-.4h-1.5c-.4 0-.6.3-.5.7.4 1.7 1.5 2.6 3.8 3v1.7c0 .3.2.5.6.6h1.2c.3 0 .5-.2.6-.6v-1.7c2.3-.4 3.7-1.5 3.7-3.4z"
        />
      </svg>
      USDC
    </span>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.2 11.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.17 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3.01.41c2.29-1.55 3.29-1.23 3.29-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.21.69.82.57A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export default function MilestoneDefinition({
  milestones,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onBack,
  onContinue,
  canContinue,
}: MilestoneDefinitionProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const total = useMemo(
    () => milestones.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [milestones]
  );

  const formattedTotal = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(total),
    [total]
  );

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain');
      const from = parseInt(raw, 10);
      if (!Number.isNaN(from) && from !== dropIndex) {
        onReorder(from, dropIndex);
      }
      setDragIndex(null);
    },
    [onReorder]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
            Milestone Definition
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Define 1–10 deliverables for your grant. Funds are escrowed and released upon proof
            verification.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Lock className="h-4 w-4 text-slate-500" strokeWidth={2} />
          Save Draft
        </button>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <article
            key={milestone.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-opacity sm:p-5 ${
              dragIndex === index ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div
              className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
            >
              <span
                tabIndex={0}
                className="cursor-grab touch-none text-slate-400 active:cursor-grabbing"
                aria-label={`Drag to reorder milestone ${index + 1}`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' && index > 0) onReorder(index, index - 1);
                  if (e.key === 'ArrowDown' && index < milestones.length - 1) {
                    onReorder(index, index + 1);
                  }
                }}
              >
                <GripVertical className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:text-[11px]">
                Milestone {index + 1}
              </span>
              <button
                type="button"
                disabled={milestones.length <= 1}
                onClick={() => onDelete(milestone.id)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                aria-label={`Delete milestone ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  value={milestone.title}
                  onChange={(e) => onUpdate(milestone.id, { title: e.target.value })}
                  placeholder="e.g. V1 Core Protocol Contracts"
                  className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Description &amp; Deliverables
                </label>
                <textarea
                  value={milestone.description}
                  onChange={(e) => onUpdate(milestone.id, { description: e.target.value })}
                  placeholder="Describe scope and acceptance criteria…"
                  rows={4}
                  className="min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Funding Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={milestone.amount}
                      onChange={(e) => onUpdate(milestone.id, { amount: e.target.value })}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-4 pr-[5.5rem] text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                    />
                    <UsdcAdornment />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Target Deadline</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={milestone.deadline}
                      onChange={(e) => onUpdate(milestone.id, { deadline: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-3 pl-4 pr-11 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                    />
                    <CalendarDays
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Verification Proof Type
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onUpdate(milestone.id, { proofType: 'zk_github' })}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      milestone.proofType === 'zk_github'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <GithubMark
                      className={`h-4 w-4 ${milestone.proofType === 'zk_github' ? 'text-white' : 'text-slate-600'}`}
                    />
                    ZK GitHub Proof
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate(milestone.id, { proofType: 'eas_only' })}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      milestone.proofType === 'eas_only'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <FileText
                      className="h-4 w-4"
                      strokeWidth={2}
                      aria-hidden
                    />
                    EAS Evidence Only
                  </button>
                </div>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                  <span>{PROOF_HELP[milestone.proofType]}</span>
                </p>
              </div>
            </div>
          </article>
        ))}

        <button
          type="button"
          disabled={milestones.length >= MAX_MILESTONES}
          onClick={onAdd}
          className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-[#fafafa] px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Milestone ({milestones.length}/{MAX_MILESTONES})
        </button>
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 border-t border-slate-200 bg-white/95 backdrop-blur sm:-mx-8">
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4 lg:justify-start">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Go to previous step"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Total Grant Amount
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
                {formattedTotal}{' '}
                <span className="text-base font-semibold text-slate-500 sm:text-lg">USDC</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[220px]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Milestones
              </p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
                {milestones.length} / {MAX_MILESTONES}
              </p>
            </div>
            <div className="h-10 w-px bg-slate-200" aria-hidden />
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">
                {canContinue ? 'Ready' : 'Incomplete'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 lg:w-auto lg:min-w-[180px]"
          >
            Continue
            <span className="text-base leading-none" aria-hidden>
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
