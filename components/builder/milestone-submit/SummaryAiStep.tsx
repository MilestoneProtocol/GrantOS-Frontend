'use client';

import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import type { AiVerifierSuccessBody, AiVerifierVerdict } from '@/lib/ai-verifier';
import { Bot, ChevronRight, Info, Loader2, ArrowLeft } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';

const SUMMARY_MIN_CHARS = 50;

function verdictStyles(v: AiVerifierVerdict) {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'UNCERTAIN':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'LIKELY_INSUFFICIENT':
      return 'border-red-200 bg-red-50 text-red-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800';
  }
}

function verdictLabel(v: AiVerifierVerdict) {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'LIKELY FULFILLED';
    case 'UNCERTAIN':
      return 'UNCERTAIN';
    case 'LIKELY_INSUFFICIENT':
      return 'LIKELY INSUFFICIENT';
    default:
      return String(v);
  }
}

export default function SummaryAiStep() {
  const {
    displayMilestone,
    repoTrimmed,
    prTrimmed,
    proofPreview,
    writtenSummary,
    setWrittenSummary,
    backToProofFromSummary,
    continueToOnchain,
    setAiSnapshot,
  } = useMilestoneSubmit();

  const [aiLoading, setAiLoading] = useState(true);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiResult, setAiResult] = useState<AiVerifierSuccessBody | null>(null);

  const prUrl = useMemo(
    () => `https://github.com/${repoTrimmed}/pull/${prTrimmed}`,
    [repoTrimmed, prTrimmed]
  );

  const charCount = writtenSummary.length;
  const meetsMinimum = charCount >= SUMMARY_MIN_CHARS;

  useEffect(() => {
    if (!proofPreview) return;

    const milestoneDescription = displayMilestone?.description ?? '';
    const ac = new AbortController();

    startTransition(() => {
      setAiLoading(true);
      setAiUnavailable(false);
      setAiResult(null);
    });

    const payload = {
      milestoneDescription,
      prUrl,
      zkVerified: proofPreview.identityMatches,
    };

    fetch('/api/ai-verifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ac.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as Partial<AiVerifierSuccessBody>;
        if (!data.verdict || typeof data.explanation !== 'string') {
          throw new Error('bad shape');
        }
        return data as AiVerifierSuccessBody;
      })
      .then((data) => setAiResult(data))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setAiUnavailable(true);
        setAiResult(null);
      })
      .finally(() => setAiLoading(false));

    return () => ac.abort();
  }, [proofPreview, displayMilestone?.description, prUrl]);

  useEffect(() => {
    if (aiResult) setAiSnapshot(aiResult);
  }, [aiResult, setAiSnapshot]);

  return (
    <div className="flex flex-1 flex-col text-slate-900">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-900">Written Summary + AI Verdict</h2>
        <p className="mt-1 text-sm text-slate-600">
          Provide context for your submission. Our AI will analyze your PR against the milestone requirements.
        </p>
      </div>

      <div className="mt-6 grid flex-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col">
          <label htmlFor="milestone-summary" className="text-sm font-medium text-slate-800">
            Describe what this PR delivers <span className="text-red-600">*</span>
          </label>
          <div className="relative mt-2">
            <textarea
              id="milestone-summary"
              value={writtenSummary}
              onChange={(e) => setWrittenSummary(e.target.value)}
              placeholder="Explain how this PR fulfills the milestone requirements. The committee will read this alongside the ZK proof."
              rows={12}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15"
            />
            <div className="pointer-events-none absolute bottom-3 right-3 text-[11px] tabular-nums text-slate-400">
              <span className={charCount < SUMMARY_MIN_CHARS ? 'text-amber-700' : 'text-emerald-700'}>
                {charCount}
              </span>
              <span className="text-slate-400"> / {SUMMARY_MIN_CHARS} min</span>
            </div>
          </div>
          {!meetsMinimum ? (
            <p className="mt-2 text-xs text-slate-500">Enter at least {SUMMARY_MIN_CHARS} characters to continue.</p>
          ) : null}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot className="h-4 w-4 text-violet-600" aria-hidden />
            AI Verdict Panel
          </div>

          <div className="mt-3 flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {aiLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" aria-hidden />
                <p className="text-sm text-slate-600">Analyzing milestone requirements and proof signals…</p>
              </div>
            ) : aiUnavailable ? (
              <div className="flex flex-1 flex-col justify-center gap-3 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950">
                <p className="font-medium">AI verdict unavailable</p>
                <p className="leading-relaxed text-amber-950/90">
                  We couldn&apos;t load an automated assessment right now. You can still continue — the committee
                  reviews your written summary and ZK proof onchain.
                </p>
              </div>
            ) : aiResult ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${verdictStyles(aiResult.verdict)}`}
                  >
                    {verdictLabel(aiResult.verdict)}
                  </span>
                  {aiResult.id ? (
                    <span className="text-[11px] font-medium tabular-nums text-slate-500">ID: {aiResult.id}</span>
                  ) : null}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">{aiResult.explanation}</p>
                <div className="mt-6 flex gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs italic leading-snug text-slate-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    This analysis is advisory only. The committee casts the deciding vote based on this summary and
                    your ZK proof.
                  </span>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No verdict data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={backToProofFromSummary}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ZK Proof
        </button>
        <button
          type="button"
          disabled={!meetsMinimum}
          onClick={continueToOnchain}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to Submission
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
