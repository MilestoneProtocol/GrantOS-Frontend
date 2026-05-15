'use client';

import MyGrantsGrantCard from '@/components/builder/my-grants/MyGrantsGrantCard';
import type { MyGrantRecord } from '@/lib/my-grants/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState } from 'react';

const VIRTUAL_THRESHOLD = 20;
const ESTIMATED_ROW_HEIGHT = 220;

type MyGrantsGrantListProps = {
  grants: MyGrantRecord[];
};

export default function MyGrantsGrantList({ grants }: MyGrantsGrantListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirtual = grants.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: grants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 4,
    enabled: useVirtual,
  });

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (grants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
        No grants match your filters.
      </p>
    );
  }

  if (!useVirtual) {
    return (
      <div className="space-y-4">
        {grants.map((g) => (
          <MyGrantsGrantCard
            key={g.key}
            grant={g}
            expanded={Boolean(expanded[g.key])}
            onToggle={() => toggle(g.key)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[min(70vh,900px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const g = grants[row.index];
          if (!g) return null;
          return (
            <div
              key={g.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
              }}
              className="pb-4"
            >
              <MyGrantsGrantCard
                grant={g}
                expanded={Boolean(expanded[g.key])}
                onToggle={() => toggle(g.key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
