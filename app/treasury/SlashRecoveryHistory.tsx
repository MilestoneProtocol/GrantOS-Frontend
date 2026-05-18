'use client';

import type { SlashRow } from '@/lib/treasury';
import { daysBetween, formatDateShort, formatUsd } from '@/lib/treasury';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

type Props = {
  rows: SlashRow[];
};

/**
 * Chronological table of every slash ever executed. Empty state celebrates
 * a clean record.
 */
export default function SlashRecoveryHistory({ rows }: Props) {
  const total = rows.reduce((s, r) => s + r.amountUsdc, 0);

  return (
    <section
      aria-label="Slash recovery history"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          Slash Recovery History
        </h2>
        {rows.length > 0 ? (
          <p className="mt-0.5 text-xs text-slate-500">
            Total recovered:{' '}
            <span className="font-semibold text-rose-600">{formatUsd(total)}</span>{' '}
            across {rows.length} event{rows.length === 1 ? '' : 's'}
          </p>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-800">No slashes executed</p>
          <p className="mt-0.5 text-xs text-slate-500">Clean record across all grants.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th scope="col" className="px-4 py-3">
                  Grant ID
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                  Milestone
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Recovered
                </th>
                <th scope="col" className="px-4 py-3">
                  Date
                </th>
                <th scope="col" className="hidden px-4 py-3 lg:table-cell">
                  Warned → Slashed
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Tx
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.grantId}</td>
                  <td className="hidden px-4 py-3 text-slate-700 sm:table-cell">
                    {r.milestoneTitle}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-rose-600">
                    {formatUsd(r.amountUsdc)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatDateShort(r.slashedAtMs)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-slate-600 lg:table-cell">
                    {daysBetween(r.slashedAtMs, r.warningIssuedAtMs)} day
                    {daysBetween(r.slashedAtMs, r.warningIssuedAtMs) === 1 ? '' : 's'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={r.txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open transaction on Arbiscan for ${r.grantId}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-sky-200 hover:text-sky-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
