'use client';

import type { BuilderWarningRecord } from '@/lib/builder-warnings';
import { ExternalLink, FileSignature, Receipt } from 'lucide-react';

type WarningExternalLinksProps = {
  record: BuilderWarningRecord;
};

/**
 * Footer of the Warning Detail page — outlined buttons linking to the
 * two onchain artefacts the builder may want to verify:
 *  - The committee's EAS attestation on easscan.org (always available).
 *  - The slash transaction on Arbiscan (only after slash is executed).
 *
 * Both open in a new tab — the PRD frames the detail page as a "purely
 * informational" surface, so we never navigate the builder out of it.
 */
export default function WarningExternalLinks({ record }: WarningExternalLinksProps) {
  const hasSlash = Boolean(record.slash);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <ExternalLinkButton
        href={record.attestationUrl}
        icon={<FileSignature className="h-4 w-4" strokeWidth={2.2} />}
      >
        View EAS Attestation
      </ExternalLinkButton>

      {hasSlash ? (
        <ExternalLinkButton
          href={record.slash!.slashTxUrl}
          icon={<Receipt className="h-4 w-4" strokeWidth={2.2} />}
        >
          View Slash Tx
        </ExternalLinkButton>
      ) : null}
    </div>
  );
}

function ExternalLinkButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      {icon}
      <span>{children}</span>
      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
    </a>
  );
}
