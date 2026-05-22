'use client';

import {
  formatSubmitUsdc,
  useMilestoneSubmit,
} from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import { Calendar, ChevronRight, Shield } from 'lucide-react';

export default function MilestoneSubmitContextPage() {
  const {
    displayMilestone,
    deadlineLabel,
    repo,
    setRepo,
    pr,
    setPr,
    setTouchedRepo,
    setTouchedPr,
    repoError,
    prError,
    canContinueStep1,
    continueFromStep1ToProof,
  } = useMilestoneSubmit();

  if (!displayMilestone) return null;

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Milestone Context</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the milestone requirements and provide the target repository details for ZK validation.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Milestone title</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {displayMilestone.title || 'Untitled milestone'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grant amount</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatSubmitUsdc(displayMilestone.amount)} USDC</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {displayMilestone.description || 'No description on chain.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="h-4 w-4 text-slate-400" />
              Deadline
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{deadlineLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Shield className="h-4 w-4 text-slate-400" />
              Proof type
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">GitHub PR merge (ZK)</p>
            <span className="mt-2 inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              Noir SDK
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Repository details</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="gh-repo" className="text-xs font-medium text-slate-600">
              GitHub repository
            </label>
            <input
              id="gh-repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onBlur={() => setTouchedRepo(true)}
              placeholder="owner/repo"
              autoComplete="off"
              className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                repoError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {repoError ? (
              <p className="mt-1 text-xs text-red-600">Enter a valid owner/repo (e.g. noir-lang/noir).</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Format: owner/repo (e.g. noir-lang/noir)</p>
            )}
          </div>
          <div>
            <label htmlFor="gh-pr" className="text-xs font-medium text-slate-600">
              Pull request number
            </label>
            <input
              id="gh-pr"
              value={pr}
              onChange={(e) => setPr(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => setTouchedPr(true)}
              placeholder="42"
              inputMode="numeric"
              className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                prError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {prError ? (
              <p className="mt-1 text-xs text-red-600">Enter a positive integer PR number.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Must be a merged PR associated with this milestone.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-8">
        <button
          type="button"
          disabled={!canContinueStep1}
          onClick={continueFromStep1ToProof}
          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to Proof Generation
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
