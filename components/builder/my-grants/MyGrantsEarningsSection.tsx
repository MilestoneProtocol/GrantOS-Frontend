'use client';

import type { MyGrantRecord } from '@/lib/my-grants/types';
import {
  buildEarningsByGrant,
  buildMonthlyEarnings,
  formatUsdcAmount,
} from '@/lib/my-grants/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MyGrantsEarningsSectionProps = {
  grants: MyGrantRecord[];
};

export default function MyGrantsEarningsSection({ grants }: MyGrantsEarningsSectionProps) {
  const [open, setOpen] = useState(false);
  const monthly = useMemo(() => buildMonthlyEarnings(grants), [grants]);
  const rows = useMemo(() => buildEarningsByGrant(grants), [grants]);

  const lifetimeNet = useMemo(
    () => Math.round(rows.reduce((s, r) => s + r.netEarnings, 0) * 100) / 100,
    [rows],
  );

  if (grants.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">Earnings Breakdown</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Monthly USDC earned and per-grant net totals
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
        )}
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
          {monthly.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${formatUsdcAmount(Number(value ?? 0))}`,
                      'Earned',
                    ]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="earned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No released earnings yet.</p>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Grant ID</th>
                  <th className="px-2 py-2 text-right">Earned</th>
                  <th className="px-2 py-2 text-right">Forfeited</th>
                  <th className="px-2 py-2 text-right">Net</th>
                  <th className="px-2 py-2 text-right">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.grantId} className="border-b border-slate-50">
                    <td className="px-2 py-2.5 font-mono text-xs font-semibold text-slate-800">
                      {r.grantId}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      ${formatUsdcAmount(r.totalEarned)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-red-600">
                      ${formatUsdcAmount(r.totalForfeited)}
                    </td>
                    <td
                      className={`px-2 py-2.5 text-right font-semibold tabular-nums ${
                        r.netEarnings >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      ${formatUsdcAmount(r.netEarnings)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-600">
                      {r.deliveryRatePercent != null ? `${r.deliveryRatePercent}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-2 py-3 text-slate-900">Lifetime total</td>
                  <td colSpan={2} className="px-2 py-3" />
                  <td className="px-2 py-3 text-right tabular-nums text-emerald-700">
                    ${formatUsdcAmount(lifetimeNet)}
                  </td>
                  <td className="px-2 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
