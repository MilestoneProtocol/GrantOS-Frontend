'use client';

import { GUIDELINES_FAQ } from '@/lib/guidelines/data';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function GuidelinesFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {GUIDELINES_FAQ.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50 sm:min-h-[48px] sm:px-5"
              aria-expanded={open}
            >
              <span className="text-sm font-semibold text-slate-900 sm:text-base">
                {item.question}
              </span>
              {open ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              )}
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              {/* inner */}
                <p className="overflow-hidden px-4 pb-4 text-base leading-relaxed text-slate-600 sm:px-5">
                  {item.answer}
                </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
