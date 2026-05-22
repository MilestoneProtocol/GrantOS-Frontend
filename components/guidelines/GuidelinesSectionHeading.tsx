import { sectionMeta } from '@/lib/guidelines/toc';
import type { GuidelinesSectionId } from '@/lib/guidelines/types';

export default function GuidelinesSectionHeading({ sectionId }: { sectionId: GuidelinesSectionId }) {
  const meta = sectionMeta(sectionId);
  return (
    <header className="space-y-3 border-b border-slate-200 pb-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl xl:text-[32px]">
        {meta.label}
      </h2>
    </header>
  );
}
