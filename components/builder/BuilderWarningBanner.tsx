'use client';

import { useBuilderWarnings, REPUTATION_WARNING_PENALTY, REPUTATION_SLASH_PENALTY } from '@/lib/builder-warnings';
import { useAccount } from 'wagmi';
import { AlertTriangle, ExternalLink, Clock, DollarSign } from 'lucide-react';
import { formatTimeRemaining } from '@/hooks/useSlashEligibility';

/**
 * Builder dashboard warning banner.
 * Shows active warnings with countdown and amount at risk.
 */
export function BuilderWarningBanner() {
  const { address } = useAccount();
  const warnings = useBuilderWarnings(address);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning) => {
        const now = Math.floor(Date.now() / 1000);
        const slashUnlocksAt = new Date(warning.slashUnlocksAtIso).getTime() / 1000;
        const timeRemaining = Math.max(0, slashUnlocksAt - now);

        return (
          <div
            key={warning.id}
            className="overflow-hidden rounded-xl border-2 border-red-500 bg-red-50 shadow-lg"
          >
            {/* Header */}
            <div className="bg-red-500 px-4 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white" />
                <h3 className="font-bold text-white">⚠️ MILESTONE WARNING</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="space-y-3">
                {/* Grant & Milestone Info */}
                <div>
                  <p className="font-semibold text-red-900">
                    {warning.grantTitle}
                  </p>
                  <p className="text-sm text-red-800">
                    Milestone {warning.milestoneIndex + 1}: {warning.milestoneTitle}
                  </p>
                </div>

                {/* Warning Message */}
                <div className="rounded-lg bg-white/50 p-3">
                  <p className="text-sm font-medium text-red-900">
                    {warning.message}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Amount at Risk */}
                  <div className="rounded-lg bg-white p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <p className="text-xs font-medium text-red-700">Amount at Risk</p>
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-red-900">
                      ${(warning.amountAtRiskUsdc / 1e6).toFixed(2)}
                    </p>
                  </div>

                  {/* Time Remaining */}
                  <div className="rounded-lg bg-white p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-600" />
                      <p className="text-xs font-medium text-red-700">Time to Slash</p>
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-red-900">
                      {timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'NOW'}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-1 text-xs text-red-700">
                  <p>
                    <span className="font-semibold">Warning Issued:</span>{' '}
                    {new Date(warning.warningIssuedAtIso).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Slash Possible After:</span>{' '}
                    {new Date(warning.slashUnlocksAtIso).toLocaleString()}
                  </p>
                  {warning.committeeMemberLabel && (
                    <p>
                      <span className="font-semibold">Issued By:</span>{' '}
                      {warning.committeeMemberLabel}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-red-200 pt-3">
                  <div className="text-xs text-red-700">
                    <p className="font-semibold">Reputation Impact:</p>
                    <p>Warning: -{REPUTATION_WARNING_PENALTY} points</p>
                    <p>If Slashed: -{REPUTATION_SLASH_PENALTY} points</p>
                  </div>
                  <a
                    href={warning.attestationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Attestation
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact warning indicator for builder header.
 */
export function BuilderWarningIndicator() {
  const { address } = useAccount();
  const warnings = useBuilderWarnings(address);

  if (warnings.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <span className="text-sm font-bold text-red-700">
        {warnings.length} Active Warning{warnings.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
