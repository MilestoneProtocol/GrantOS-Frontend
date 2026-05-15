import { sectionMeta } from '@/lib/guidelines/toc';
import type { GuidelinesSectionId } from '@/lib/guidelines/types';

export default function GuidelinesSectionHeading({ sectionId }: { sectionId: GuidelinesSectionId }) {
  const meta = sectionMeta(sectionId);
  return (
    <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-700">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Section {meta.number}
      </p>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl xl:text-[32px]">
        {meta.label}
      </h2>
    </header>
  );
}
