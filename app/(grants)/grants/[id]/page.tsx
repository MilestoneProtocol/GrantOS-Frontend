'use client';

import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import ReputationBadge from '@/components/ReputationBadge';
import { useGrantDetailFull } from '@/hooks/useGrantDetailFull';
import { useBuilderReputation } from '@/hooks/useBuilderReputation';
import { easAttestationScanUrl } from '@/lib/eas-scan';
import {
  GRANT_FACTORY_ADDRESS,
  IDENTITY_REGISTRY_ADDRESS,
  grantFactoryAbi,
  identityRegistryAbi,
} from '@/lib/escrow';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Gavel,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';

function parseGrantId(raw: string): number | null {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsdc(v: string) {
  return (Number(BigInt(v)) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(ts: string | number) {
  const timestamp = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (timestamp <= 0) return '—';
  return new Date(timestamp * 1000).toLocaleString();
}

function arbiscanTx(hash: string) {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}

export default function GrantDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id ?? '';
  const grantId = useMemo(() => parseGrantId(rawId), [rawId]);

  const { data: grantDetail, isLoading, error } = useGrantDetailFull(grantId);

  const { data: reputation } = useBuilderReputation(
    grantDetail ? grantDetail.grant.granteeAddress : null
  );

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: grantDetail ? [grantDetail.grant.granteeAddress as `0x${string}`] : undefined,
    query: { enabled: Boolean(grantDetail) },
  });

  const identity = identityData as { isVerified: boolean; tier: bigint; githubHandle: string } | undefined;

  const totalUsdc = useMemo(() => {
    if (!grantDetail) return '0';
    return grantDetail.milestones.reduce((sum, m) => {
      return (BigInt(sum) + BigInt(m.amount)).toString();
    }, '0');
  }, [grantDetail]);

  if (isLoading) {
    return (
      <OnboardingShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="mt-4 text-sm font-medium text-slate-500">Loading grant details...</p>
            </div>
          </div>
        </main>
      </OnboardingShell>
    );
  }

  if (error || !grantDetail) {
    return (
      <OnboardingShell>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grant not found</h1>
            <p className="mt-2 text-sm text-slate-500">
              This grant ID does not exist or has not been indexed yet.
            </p>
            <Link
              href="/grants"
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
            >
              Back to explorer
            </Link>
          </section>
        </main>
      </OnboardingShell>
    );
  }

  const { grant, milestones } = grantDetail;

  return (
    <OnboardingShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/grants"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to explorer
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Grant #{grant.onChainId}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Grant Details
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/builders/${grant.granteeAddress}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Builder: {shortenAddress(grant.granteeAddress)}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                {reputation && (
                  <ReputationBadge
                    score={reputation.score}
                    letterGrade={reputation.letterGrade}
                    size="md"
                    zkVerified={identity?.isVerified || reputation.zkVerified}
                  />
                )}
                {identity?.isVerified && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    ZK Verified
                  </div>
                )}
                {grant.isStreaming && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                    Streaming
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500">Total Grant</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                ${formatUsdc(totalUsdc)}
              </p>
              <p className="mt-1 text-xs text-slate-500">USDC</p>
            </div>
          </div>

          {/* Grant Info */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Escrow" value={shortenAddress(grant.escrowAddress)} />
            <InfoCard label="Committee Size" value={grant.committee.length.toString()} />
            <InfoCard label="Quorum" value={grant.quorum.toString()} />
            <InfoCard label="Created" value={new Date(grant.createdAt).toLocaleDateString()} />
          </div>
        </div>

        {/* Milestones Timeline */}
        <div className="mt-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Milestone Timeline</h2>
          <div className="mt-4 space-y-4">
            {milestones.map((milestone) => (
              <MilestoneCard key={milestone.index} milestone={milestone} quorum={grant.quorum} />
            ))}
          </div>
        </div>

        {/* Committee */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Committee Members</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grant.committee.map((addr) => (
              <div
                key={addr}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700"
              >
                {shortenAddress(addr)}
              </div>
            ))}
          </div>
        </div>
      </main>
    </OnboardingShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MilestoneCard({
  milestone,
  quorum,
}: {
  milestone: any;
  quorum: number;
}) {
  const status = milestone.submission
    ? milestone.submission.status
    : 'pending';

  const statusConfig = {
    approved: { icon: CheckCircle2, color: 'emerald', label: 'Approved' },
    submitted: { icon: Clock, color: 'amber', label: 'In Review' },
    rejected: { icon: XCircle, color: 'red', label: 'Rejected' },
    pending: { icon: Clock, color: 'slate', label: 'Pending' },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {milestone.index + 1}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{milestone.title}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">{milestone.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-500">Amount:</span>{' '}
              <span className="font-bold text-slate-900">${formatUsdc(milestone.amount)} USDC</span>
            </div>
            <div>
              <span className="font-medium text-slate-500">Deadline:</span>{' '}
              <span className="font-semibold text-slate-700">{formatDate(milestone.deadline)}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500">Proof Type:</span>{' '}
              <span className="font-semibold text-slate-700">
                {milestone.proofType === 0 ? 'ZK GitHub' : 'EAS Only'}
              </span>
            </div>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset bg-${config.color}-50 text-${config.color}-700 ring-${config.color}-200`}>
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </div>
      </div>

      {/* Submission Details */}
      {milestone.submission && (
        <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Builder Summary</h4>
            <p className="mt-1 text-sm text-slate-600">{milestone.submission.builderSummary}</p>
          </div>

          {milestone.submission.prUrl && (
            <div>
              <h4 className="text-sm font-bold text-slate-900">Pull Request</h4>
              <a
                href={milestone.submission.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
              >
                {milestone.submission.prUrl}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* ZK Proof Status */}
          {milestone.submission.zkVerified && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-700">ZK Proof Verified</span>
            </div>
          )}

          {/* AI Verdict */}
          {milestone.submission.aiVerdict && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">AI Verdict:</span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                  {milestone.submission.aiVerdict}
                </span>
              </div>
              {milestone.submission.aiExplanation && (
                <p className="mt-2 text-sm text-slate-600">{milestone.submission.aiExplanation}</p>
              )}
            </div>
          )}

          {/* Voting Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">
                {milestone.submission.approvalCount} / {quorum} approvals
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-slate-700">
                {milestone.submission.rejectionCount} rejections
              </span>
            </div>
          </div>

          {/* Transaction Links */}
          <div className="flex flex-wrap gap-3">
            {milestone.submission.submissionTxHash && (
              <a
                href={arbiscanTx(milestone.submission.submissionTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Submission TX
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {milestone.submission.easAttestationUid && (
              <a
                href={easAttestationScanUrl(milestone.submission.easAttestationUid as `0x${string}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                EAS Attestation
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {milestone.warnings.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Warnings ({milestone.warnings.length})
          </h4>
          {milestone.warnings.map((warning: any) => (
            <div key={warning.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900">{warning.message}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Issued by {shortenAddress(warning.committeeAddress)} on{' '}
                    {formatDate(warning.warningTimestamp)}
                  </p>
                  {warning.slashed && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-red-700">
                      <Gavel className="h-3.5 w-3.5" />
                      Slashed: ${formatUsdc(warning.amountReturnedUsdc || '0')} USDC recovered
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={arbiscanTx(warning.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
                >
                  Warning TX
                  <ExternalLink className="h-3 w-3" />
                </a>
                {warning.slashTxHash && (
                  <a
                    href={arbiscanTx(warning.slashTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900"
                  >
                    Slash TX
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <a
                  href={easAttestationScanUrl(warning.attestationUid as `0x${string}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
                >
                  EAS Attestation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
