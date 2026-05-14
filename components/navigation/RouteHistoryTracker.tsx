'use client';

import { pushRouteHistory } from '@/lib/route-history';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

type SearchParamsLike = { toString(): string };

function buildRoute(pathname: string | null, searchParams: SearchParamsLike) {
  const query = searchParams.toString();
  return `${pathname || '/'}${query ? `?${query}` : ''}`;
}

export default function RouteHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    pushRouteHistory(buildRoute(pathname, searchParams));
  }, [pathname, searchParams]);

  return null;
}
