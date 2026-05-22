'use client';

import { applyThemeClass } from '@/store/settingsStore';
import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyThemeClass('light');
  }, []);

  return children;
}
