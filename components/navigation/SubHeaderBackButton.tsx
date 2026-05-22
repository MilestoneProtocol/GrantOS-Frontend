'use client';

import { getPreviousRoute } from '@/lib/route-history';
import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type SubHeaderBackButtonProps = {
  label: string;
  fallbackHref: string;
  className?: string;
};

type SearchParamsLike = { toString(): string };

function buildCurrentRoute(pathname: string | null, searchParams: SearchParamsLike) {
  const query = searchParams.toString();
  return `${pathname || '/'}${query ? `?${query}` : ''}`;
}

export default function SubHeaderBackButton({
  label,
  fallbackHref,
  className = '',
}: SubHeaderBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const currentRoute = buildCurrentRoute(pathname, searchParams);
    const previousRoute = getPreviousRoute(currentRoute);

    router.push(previousRoute ?? fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-900 active:scale-[0.98] active:bg-slate-100 ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
