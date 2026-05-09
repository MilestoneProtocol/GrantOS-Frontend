'use client';

import { useMilestoneSubmit } from '@/components/builder/milestone-submit/MilestoneSubmitProvider';
import type { AiVerifierVerdict } from '@/lib/ai-verifier';
import { easAttestationScanUrl } from '@/lib/eas-scan';
import { Bot, Check, ChevronRight, Copy } from 'lucide-react';
import Link from 'next/link';
import { useCallback } from 'react';

const ZERO_UID =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

function verdictShort(v: AiVerifierVerdict | string | undefined): string {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'Passed';
    case 'UNCERTAIN':
      return 'Uncertain';
    case 'LIKELY_INSUFFICIENT':
      return 'Insufficient';
    default:
      return v ? String(v) : '—';
  }
}

function verdictBadgeClass(v: AiVerifierVerdict | string | undefined): string {
  switch (v) {
    case 'LIKELY_FULFILLED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'UNCERTAIN':
      return 'border-amber-200 bg-amber-50 text-amber-950';
    case 'LIKELY_INSUFFICIENT':
      return 'border-red-200 bg-red-50 text-red-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function truncateMiddle(s: string, start = 6, end = 6) {
  if (s.length <= start + end + 3) return s;
  return `${s.slice(0, start + 2)}…${s.slice(-end)}`;
}

function formatUtcSubmitted(ms: number): string {
  const d = new Date(ms);
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${datePart} • ${timePart} UTC`;
}

export default function MilestoneSubmitSuccess() {
  const {
    proofPreview,
    writtenSummary,
    aiSnapshot,
    displayMilestone,
    submissionMeta,
    routeGrantId,
  } = useMilestoneSubmit();

  const hashDisplay = proofPreview?.proofHash ?? '';
  const easUid = submissionMeta?.easUid?.trim();
  const showEasLink = Boolean(easUid && easUid !== ZERO_UID);
  const easScanHref = showEasLink ? easAttestationScanUrl(easUid!) : '';

  const copyHash = useCallback(() => {
    if (hashDisplay) navigator.clipboard.writeText(hashDisplay).catch(() => {});
  }, [hashDisplay]);

  const milestoneTitle = displayMilestone?.title?.trim() || 'Milestone';

  return (
    <div className="flex flex-col items-center text-center text-slate-900">
      <div
        className="animate-success-check animate-success-ring flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_40px_rgba(16,185,129,0.35)]"
        aria-hidden
      >
        <Check className="h-10 w-10 stroke-[3] text-white" strokeLinecap="round" strokeLinejoin="round" />
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">Milestone Submitted</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Your ZK proof and written summary have been successfully attested onchain.
      </p>

      <div className="mt-10 w-full max-w-xl text-left">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="h-1 w-full bg-linear-to-r from-blue-500 via-sky-400 to-emerald-500" />

          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                Attestation summary
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-900">
                <Bot className="h-3.5 w-3.5" aria-hidden />
                AI Verified
              </span>
            </div>

            <h2 className="mt-3 text-xl font-bold text-slate-900">{milestoneTitle}</h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">ZK proof hash</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                  <span className="min-w-0 flex-1 truncate">{truncateMiddle(hashDisplay)}</span>
                  <button
                    type="button"
                    onClick={copyHash}
                    className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
                    aria-label="Copy full hash"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Submission time</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                  {submissionMeta ? formatUtcSubmitted(submissionMeta.completedAt) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-slate-500">AI verdict</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${verdictBadgeClass(aiSnapshot?.verdict)}`}
                >
                  {verdictShort(aiSnapshot?.verdict)}
                </span>
                {aiSnapshot?.id ? (
                  <span className="text-[10px] text-slate-400">ID: {aiSnapshot.id}</span>
                ) : null}
              </div>
              {aiSnapshot?.explanation ? (
                <p className="mt-2 text-xs leading-snug text-slate-600">{aiSnapshot.explanation}</p>
              ) : null}
            </div>

            <div className="mt-8">
              <p className="text-xs font-medium text-slate-500">Written summary preview</p>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                <p className="text-left text-sm italic leading-relaxed text-slate-700 [font-family:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif]">
                  {writtenSummary.trim() || '—'}
                </p>
              </div>
            </div>

            {showEasLink && easScanHref ? (
              <a
                href={easScanHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100/90"
              >
                <span className="flex items-center gap-2">
                  <span className="text-blue-600">View on EAS Scan</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
              </a>
            ) : (
              <p className="mt-6 text-center text-xs text-slate-400">
                Configure <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_EAS_ATTESTATION_URL_TEMPLATE</code>{' '}
                or complete an EAS attestation to link EAS Scan.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:flex-initial sm:min-w-[160px]"
        >
          Back to Dashboard
        </Link>
        <Link
          href={`/grants/${encodeURIComponent(routeGrantId)}`}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 sm:flex-initial sm:min-w-[160px]"
        >
          View Grant
        </Link>
      </div>

      <p className="mt-10 max-w-lg text-xs leading-relaxed text-slate-500">
        The committee has been notified. You will see the milestone status update to{' '}
        <strong className="font-semibold text-slate-700">Approved</strong> or{' '}
        <strong className="font-semibold text-slate-700">Rejected</strong> on your dashboard.
      </p>
    </div>
  );
}
