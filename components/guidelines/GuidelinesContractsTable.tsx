'use client';

import GuidelinesScrollTable from '@/components/guidelines/GuidelinesScrollTable';
import { GUIDELINES_CONTRACTS, arbiscanAddressUrl } from '@/lib/guidelines/data';
import { Copy, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';

function AddressActions({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        {copied ? 'Copied' : 'Copy'}
      </button>
      <a
        href={arbiscanAddressUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Explorer
      </a>
    </div>
  );
}

export default function GuidelinesContractsTable() {
  return (
    <GuidelinesScrollTable caption="Smart contract addresses on Arbitrum Sepolia">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <th className="px-4 py-3">Contract</th>
          <th className="px-4 py-3">Address (Arbitrum Sepolia)</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {GUIDELINES_CONTRACTS.map((row, i) => (
          <tr
            key={row.name}
            className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}
          >
            <th scope="row" className="px-4 py-3.5 text-left text-sm font-semibold text-slate-900">
              {row.name}
            </th>
            <td className="px-4 py-3.5 font-mono text-xs text-slate-700 sm:text-sm">
              {row.address}
            </td>
            <td className="px-4 py-3.5">
              <AddressActions address={row.address} />
            </td>
          </tr>
        ))}
      </tbody>
    </GuidelinesScrollTable>
  );
}
