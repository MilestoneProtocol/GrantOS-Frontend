'use client';

import HomeToast from '@/components/home/HomeToast';
import Link from 'next/link';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HomeToast />
      </Suspense>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">GrantOS</h1>
        <p className="max-w-md text-center text-sm text-slate-600">
          Home landing. Committee members can open the{' '}
          <Link href="/committee" className="font-semibold text-sky-600 hover:underline">
            Committee dashboard
          </Link>{' '}
          or the{' '}
          <Link href="/dao" className="font-semibold text-sky-600 hover:underline">
            DAO overview
          </Link>
          .
        </p>
        <Link href="/verify" className="text-sm font-medium text-sky-600 hover:underline">
          Identity verification →
        </Link>
      </main>
    </>
  );
}
