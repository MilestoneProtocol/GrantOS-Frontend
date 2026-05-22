'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyBackButton({ href = '/?select=1' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </Link>
  );
}
