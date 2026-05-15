'use client';

import GuidelinesScrollTable from '@/components/guidelines/GuidelinesScrollTable';
import { SCORING_EVENTS } from '@/lib/guidelines/data';

export default function GuidelinesScoringTable() {
  return (
    <GuidelinesScrollTable caption="Reputation scoring events">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
          <th className="px-4 py-3">Event type</th>
          <th className="px-4 py-3">Actor</th>
          <th className="px-4 py-3">Score impact</th>
          <th className="px-4 py-3">Description</th>
        </tr>
      </thead>
      <tbody>
        {SCORING_EVENTS.map((row, i) => (
          <tr
            key={row.event}
            className={`border-b border-slate-100 dark:border-slate-800 ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-slate-800/30' : ''}`}
          >
            <th scope="row" className="px-4 py-3.5 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
              {row.event}
            </th>
            <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{row.actor}</td>
            <td
              className={`px-4 py-3.5 font-mono text-sm font-semibold ${row.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {row.points}
            </td>
            <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{row.notes}</td>
          </tr>
        ))}
      </tbody>
    </GuidelinesScrollTable>
  );
}
