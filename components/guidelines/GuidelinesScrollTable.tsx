'use client';

import type { ReactNode } from 'react';

type GuidelinesScrollTableProps = {
  children: ReactNode;
  caption?: string;
  stickyFirstColumn?: boolean;
};

export default function GuidelinesScrollTable({
  children,
  caption,
  stickyFirstColumn = true,
}: GuidelinesScrollTableProps) {
  return (
    <div className="guidelines-table-wrap relative">
      <div className="guidelines-table-scroll overflow-x-auto rounded-xl border border-slate-200">
        <table
          className={`guidelines-table w-full min-w-[640px] border-collapse text-left text-sm ${stickyFirstColumn ? 'guidelines-table--sticky-col' : ''}`}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {children}
        </table>
      </div>
    </div>
  );
}
