'use client';

import { DEFAULT_SECTION_ID, isGuidelinesSectionId } from '@/lib/guidelines/toc';
import type { GuidelinesSectionId } from '@/lib/guidelines/types';
import { useCallback, useEffect, useState } from 'react';

function sectionFromHash(): GuidelinesSectionId {
  if (typeof window === 'undefined') return DEFAULT_SECTION_ID;
  const hash = window.location.hash.replace(/^#/, '');
  return isGuidelinesSectionId(hash) ? hash : DEFAULT_SECTION_ID;
}

export function useGuidelinesSection() {
  const [activeId, setActiveId] = useState<GuidelinesSectionId>(DEFAULT_SECTION_ID);

  useEffect(() => {
    setActiveId(sectionFromHash());
    const onHash = () => setActiveId(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectSection = useCallback((id: GuidelinesSectionId) => {
    setActiveId(id);
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}#${id}`;
      window.history.replaceState(null, '', url);
    }
  }, []);

  return { activeId, selectSection };
}
