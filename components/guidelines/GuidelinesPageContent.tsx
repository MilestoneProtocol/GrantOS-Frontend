'use client';

import GuidelinesSectionContent from '@/components/guidelines/GuidelinesSectionContent';
import {
  GuidelinesTocDropdown,
  GuidelinesTocPills,
  GuidelinesTocSidebar,
} from '@/components/guidelines/GuidelinesToc';
import { useGuidelinesSection } from '@/components/guidelines/useGuidelinesSection';

export default function GuidelinesPageContent() {
  const { activeId, selectSection } = useGuidelinesSection();

  return (
    <div className="guidelines-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:py-12">
      <header className="mb-8 max-w-3xl space-y-3 xl:mb-10">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">
          Protocol Reference
        </span>
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900 sm:text-[32px] xl:text-[48px] xl:leading-tight">
          GrantOS v3 — Protocol Guidelines
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Everything you need to know about how cryptographic grant enforcement works.
        </p>
      </header>

      <div className="sticky top-[57px] z-20 -mx-4 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-white/80 md:-mx-6 md:px-6 xl:static xl:z-auto xl:mx-0 xl:border-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
        <GuidelinesTocDropdown activeId={activeId} onSelect={selectSection} />
        <GuidelinesTocPills activeId={activeId} onSelect={selectSection} />
      </div>

      <div className="mt-6 flex gap-10 xl:mt-8">
        <aside className="hidden w-1/4 shrink-0 xl:block">
          <div className="sticky top-24">
            <GuidelinesTocSidebar activeId={activeId} onSelect={selectSection} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 xl:w-3/4" aria-live="polite">
          <GuidelinesSectionContent sectionId={activeId} />
        </main>
      </div>
    </div>
  );
}
