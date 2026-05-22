'use client';

import { useEffect, useState } from 'react';
import { getSlashCount } from '@/lib/warning-api';

export function useSlashCounter(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      try {
        const slashCount = await getSlashCount();
        if (mounted) setCount(slashCount);
      } catch (err) {
        console.error('Failed to fetch slash count:', err);
      }
    }

    fetch();
    const interval = setInterval(fetch, 15000); // Refresh every 15s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
