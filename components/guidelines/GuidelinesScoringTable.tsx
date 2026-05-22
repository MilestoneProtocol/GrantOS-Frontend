'use client';

import GuidelinesScrollTable from '@/components/guidelines/GuidelinesScrollTable';
import { SCORING_EVENTS } from '@/lib/guidelines/data';

export default function GuidelinesScoringTable() {
  return (
    <GuidelinesScrollTable caption="Reputation scoring events">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
            className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}
          >
            <th scope="row" className="px-4 py-3.5 text-left text-sm font-medium text-slate-900">
              {row.event}
            </th>
            <td className="px-4 py-3.5 text-sm text-slate-600">{row.actor}</td>
            <td
              className={`px-4 py-3.5 font-mono text-sm font-semibold ${row.positive ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {row.points}
            </td>
            <td className="px-4 py-3.5 text-sm text-slate-600">{row.notes}</td>
          </tr>
        ))}
      </tbody>
    </GuidelinesScrollTable>
  );
}
