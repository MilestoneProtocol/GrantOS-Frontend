'use client';

import { GUIDELINES_TOC } from '@/lib/guidelines/toc';
import type { GuidelinesSectionId } from '@/lib/guidelines/types';
import { ChevronDown } from 'lucide-react';

type GuidelinesTocProps = {
  activeId: GuidelinesSectionId;
  onSelect: (id: GuidelinesSectionId) => void;
};

function TocButton({
  id,
  label,
  active,
  onSelect,
  layout,
}: {
  id: GuidelinesSectionId;
  label: string;
  active: boolean;
  onSelect: (id: GuidelinesSectionId) => void;
  layout: 'sidebar' | 'pill';
}) {
  if (layout === 'pill') {
    return (
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
          active
            ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-600'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:text-slate-100'
        }`}
        aria-current={active ? 'true' : undefined}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`group relative w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
      }`}
      aria-current={active ? 'true' : undefined}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600"
          aria-hidden
        />
      ) : null}
      <span className="block pl-1">{label}</span>
    </button>
  );
}

export function GuidelinesTocSidebar({ activeId, onSelect }: GuidelinesTocProps) {
  return (
    <nav aria-label="Guidelines contents" className="hidden xl:block">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        Contents
      </p>
      <ul className="mt-3 space-y-0.5">
        {GUIDELINES_TOC.map((item) => (
          <li key={item.id}>
            <TocButton
              id={item.id}
              label={item.label}
              active={activeId === item.id}
              onSelect={onSelect}
              layout="sidebar"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function GuidelinesTocPills({ activeId, onSelect }: GuidelinesTocProps) {
  return (
    <nav
      aria-label="Guidelines sections"
      className="guidelines-pills-scroll hidden overflow-x-auto pb-1 md:flex xl:hidden"
    >
      <div className="flex gap-2">
        {GUIDELINES_TOC.map((item) => (
          <TocButton
            key={item.id}
            id={item.id}
            label={item.shortLabel}
            active={activeId === item.id}
            onSelect={onSelect}
            layout="pill"
          />
        ))}
      </div>
    </nav>
  );
}

export function GuidelinesTocDropdown({ activeId, onSelect }: GuidelinesTocProps) {
  const active = GUIDELINES_TOC.find((i) => i.id === activeId);

  return (
    <label className="relative block md:hidden">
      <span className="sr-only">Jump to section</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Jump to
      </span>
      <select
        value={activeId}
        onChange={(e) => onSelect(e.target.value as GuidelinesSectionId)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-[4.5rem] pr-10 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        {GUIDELINES_TOC.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <span className="sr-only">Current: {active?.label}</span>
    </label>
  );
}
