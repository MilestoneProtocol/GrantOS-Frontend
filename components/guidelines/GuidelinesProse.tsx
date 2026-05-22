import type { ReactNode } from 'react';

export function GuidelinesLead({ children }: { children: ReactNode }) {
  return (
    <p className="text-base leading-relaxed text-slate-600 sm:text-[17px]">
      {children}
    </p>
  );
}

export function GuidelinesBody({ children }: { children: ReactNode }) {
  return (
    <p className="text-base leading-relaxed text-slate-700">{children}</p>
  );
}

export function GuidelinesSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
      {children}
    </h3>
  );
}

export function GuidelinesList({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-base leading-relaxed text-slate-700 marker:font-semibold marker:text-slate-500">
      {children}
    </ol>
  );
}

export function GuidelinesListItem({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

export function GuidelinesStepBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <p className="text-base leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}
