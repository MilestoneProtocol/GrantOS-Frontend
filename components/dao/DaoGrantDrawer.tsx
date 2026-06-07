'use client';

import type { DaoGrantCardModel, DaoMilestoneModel } from '@/demo/dao-dashboard';
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  FileCheck2,
  FileKey2,
  Gavel,
  Hash,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useGrantDetailFull } from '@/hooks/useGrantDetailFull';
type DaoGrantDrawerProps = {
  grant: DaoGrantCardModel | null;
  onClose: () => void;
};

/**
 * Grant Detail Drawer — slides in from the right on desktop, bottom sheet on
 * mobile. Read-only. Mirrors the UXPilot design as closely as possible with
 * our existing DaoAppShell header/sidebar.
 *
 * Sections
 * - Header: grant id, builder, ZK verified, totals, payment mode, creation time.
 * - Body: vertical timeline of milestones in order.
 *   Each milestone expands into 4 accordions: ZK Proof, AI Verdict,
 *   Warning History, Transactions.
 * - Footer (only when streaming active): live stream panel with 100ms ticker.
 */
export default function DaoGrantDrawer({ grant, onClose }: DaoGrantDrawerProps) {
  const grantId = grant ? Number(grant.slug) : null;
  const { data: fullDetail, isLoading: isFullDetailLoading } = useGrantDetailFull(
    grant ? grantId : null
  );

  const mappedMilestones = useMemo((): DaoMilestoneModel[] => {
    if (!grant) return [];
    if (!fullDetail) {
      return grant.milestones;
    }

    return fullDetail.milestones.map((m): DaoMilestoneModel => {
      const isSlashed = m.warnings?.some((w) => w.slashed) ?? false;
      const hasWarning = (m.warnings?.length ?? 0) > 0 && !isSlashed;
      const isApproved = m.submission?.status === 'approved';
      const isOverdue = !m.submission && (Number(m.deadline) * 1000 < Date.now());

      let status: DaoMilestoneModel['status'] = 'pending';
      if (isSlashed) status = 'slashed';
      else if (hasWarning) status = 'warning_issued';
      else if (isApproved) status = 'approved';
      else if (isOverdue) status = 'overdue';

      let proofType: DaoMilestoneModel['proofType'] = 'Manual';
      if (m.proofType === 0) proofType = 'ZK';
      else if (m.proofType === 1) proofType = 'PR';

      const zkProof: DaoMilestoneModel['zkProof'] = m.submission
        ? {
            proofHash: (m.submission.proofHash || '0x') as `0x${string}`,
            prNumber: m.submission.prUrl ? parseInt(m.submission.prUrl.split('/').pop() || '0') : 0,
            mergeStatus: m.submission.status === 'approved' ? 'Merged' : 'Open',
            authorHandle: '@builder',
            verification: m.submission.zkVerified ? 'Verified' : 'Unverified',
            verifiedBlockNumber: m.submission.zkVerified ? 29384123 : undefined,
          }
        : {
            proofHash: '0x' as `0x${string}`,
            prNumber: 0,
            mergeStatus: 'Open',
            authorHandle: '@builder',
            verification: 'Unverified',
          };

      const aiVerdict: DaoMilestoneModel['aiVerdict'] = m.submission
        ? {
            badge: (m.submission.aiVerdict || 'Review') as 'Pass' | 'Review' | 'Fail',
            explanation: m.submission.aiExplanation || 'Awaiting AI analysis.',
          }
        : {
            badge: 'Review',
            explanation: 'Awaiting submission. No artifacts available yet.',
          };

      const warningHistory = (m.warnings || []).map((w) => ({
        issuedAtIso: w.warningTimestamp,
        committeeMember: w.committeeAddress as `0x${string}`,
        message: w.message,
        attestationUrl: `https://arbitrum-sepolia.easscan.org/attestation/view/${w.attestationUid}`,
      }));

      const transactions: DaoMilestoneModel['transactions'] = [];
      if (m.submission) {
        transactions.push({
          kind: 'submission',
          txHash: (m.submission.submissionTxHash || '0x') as `0x${string}`,
          txUrl: `https://sepolia.arbiscan.io/tx/${m.submission.submissionTxHash}`,
          timestampIso: m.submission.createdAt,
        });
        if (m.submission.status === 'approved') {
          transactions.push({
            kind: 'payment',
            txHash: (m.submission.submissionTxHash || '0x') as `0x${string}`,
            txUrl: `https://sepolia.arbiscan.io/tx/${m.submission.submissionTxHash}`,
            timestampIso: m.submission.createdAt,
          });
        }
      }
      (m.warnings || []).forEach((w) => {
        transactions.push({
          kind: 'warning',
          txHash: w.txHash as `0x${string}`,
          txUrl: `https://sepolia.arbiscan.io/tx/${w.txHash}`,
          timestampIso: w.warningTimestamp,
        });
        if (w.slashed && w.slashTxHash) {
          transactions.push({
            kind: 'slash',
            txHash: w.slashTxHash as `0x${string}`,
            txUrl: `https://sepolia.arbiscan.io/tx/${w.slashTxHash}`,
            timestampIso: w.slashedAt || w.warningTimestamp,
          });
        }
      });

      return {
        index: m.index + 1,
        title: m.title,
        description: m.description,
        amountUsdc: Number(BigInt(m.amount) / BigInt(1000000)),
        deadlineIso: new Date(Number(m.deadline) * 1000).toISOString(),
        status,
        proofType,
        zkProof,
        aiVerdict,
        warningHistory,
        transactions,
      };
    });
  }, [grant, fullDetail]);

  if (!grant) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dao-drawer-title"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-[520px] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0"
      >
        <DrawerHeader grant={grant} onClose={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          <div className="space-y-5">
            {isFullDetailLoading && (
              <div className="flex items-center justify-center space-x-2 py-4 text-xs font-semibold text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                <span>Loading latest milestone updates...</span>
              </div>
            )}
            <section aria-label="Milestone timeline" className="space-y-4">
              {mappedMilestones.map((m, idx) => (
                <MilestoneTimelineEntry
                  key={m.index}
                  milestone={m}
                  isLast={idx === mappedMilestones.length - 1}
                />
              ))}
            </section>
          </div>
        </div>

        {grant.isStreamingActive ? (
          <StreamPanel grant={grant} />
        ) : null}
      </div>
    </>
  );
}

function DrawerHeader({ grant, onClose }: { grant: DaoGrantCardModel; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-100 bg-white">
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              id="dao-drawer-title"
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-900"
            >
              {grant.displayId.replace('#', 'GRT-')}
            </p>
            {grant.zkVerified ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck className="h-3 w-3" strokeWidth={2.4} aria-hidden /> ZK Verified
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Builder address
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-slate-700">
            {truncateAddress(grant.builder)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <HeaderStat label="Total Grant Amount" value={`${formatUsd(grant.totalGrantUsdc)} USDC`} />
            <HeaderStat
              label="Payment Mode"
              value={grant.paymentMode === 'streaming' ? 'Sablier Stream' : 'Lump Sum'}
              icon={grant.paymentMode === 'streaming' ? <Waves className="h-3.5 w-3.5 text-sky-600" /> : undefined}
            />
            <HeaderStat label="Creation Date" value={formatDate(grant.createdAtIso)} />
            <HeaderStat label="Reputation" value={`${grant.reputationScore}/100`} />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-900">
        {icon}
        {value}
      </p>
    </div>
  );
}

function MilestoneTimelineEntry({
  milestone,
  isLast,
}: {
  milestone: DaoMilestoneModel;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* timeline rail */}
      <div className="absolute left-2.5 top-3 flex h-full flex-col items-center">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ring-4 ring-white ${dotTone(milestone.status)}`}
        />
        {!isLast ? <span aria-hidden className="mt-1 w-px flex-1 bg-slate-200" /> : null}
      </div>

      <div className="pl-9">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">Milestone {milestone.index}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{milestone.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {milestone.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  {formatUsd(milestone.amountUsdc)} USDC
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusPillTone(
                    milestone.status,
                  )}`}
                >
                  {statusIcon(milestone.status)}
                  {statusLabel(milestone.status)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  <ShieldCheck className="h-3 w-3 text-slate-400" aria-hidden /> {milestone.proofType}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatDate(milestone.deadlineIso)}
                </span>
              </div>
            </div>

            <ChevronDown
              className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </div>
        </button>

        {open ? (
          <div className="mt-3 space-y-2">
            <Accordion title="ZK Proof Verification" icon={<FileKey2 className="h-4 w-4" />}>
              <ZkProofSection milestone={milestone} />
            </Accordion>
            <Accordion title="AI Code Verdict" icon={<Sparkles className="h-4 w-4" />}>
              <AiVerdictSection milestone={milestone} />
            </Accordion>
            <Accordion title="Warning History" icon={<Gavel className="h-4 w-4" />}>
              <WarningHistorySection milestone={milestone} />
            </Accordion>
            <Accordion title="Transactions" icon={<Hash className="h-4 w-4" />}>
              <TransactionsSection milestone={milestone} />
            </Accordion>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Accordion({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="text-slate-500">{icon}</span>
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function ZkProofSection({ milestone }: { milestone: DaoMilestoneModel }) {
  const zk = milestone.zkProof;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <KV label="Proof hash" value={truncateHash(zk.proofHash)} mono />
      <KV label="PR number" value={zk.prNumber ? `#${zk.prNumber}` : '—'} />
      <KV label="Merge status" value={zk.mergeStatus} />
      <KV label="Author" value={zk.authorHandle} />
      <KV
        label="Verification"
        value={zk.verification === 'Verified' ? 'Verified ✓' : 'Unverified ✗'}
        tone={zk.verification === 'Verified' ? 'emerald' : 'slate'}
      />
      <KV label="Block number" value={zk.verifiedBlockNumber ? `${zk.verifiedBlockNumber}` : '—'} mono />
    </div>
  );
}

function AiVerdictSection({ milestone }: { milestone: DaoMilestoneModel }) {
  const v = milestone.aiVerdict;
  const pill =
    v.badge === 'Pass'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : v.badge === 'Fail'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-900';
  return (
    <div>
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill}`}>
        {v.badge}
      </span>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{v.explanation}</p>
    </div>
  );
}

function WarningHistorySection({ milestone }: { milestone: DaoMilestoneModel }) {
  if (milestone.warningHistory.length === 0) {
    return <p className="text-sm text-slate-500">No warning attestations recorded.</p>;
  }
  return (
    <div className="space-y-3">
      {milestone.warningHistory.map((w) => (
        <div key={`${w.issuedAtIso}-${w.committeeMember}`} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-amber-900">{formatDateTime(w.issuedAtIso)}</p>
            <a
              href={w.attestationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
            >
              EAS Attestation <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-1 text-xs font-medium text-amber-900/90">
            Committee: <span className="font-mono">{truncateAddress(w.committeeMember)}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">&ldquo;{w.message}&rdquo;</p>
        </div>
      ))}
    </div>
  );
}

function TransactionsSection({ milestone }: { milestone: DaoMilestoneModel }) {
  if (milestone.transactions.length === 0) {
    return <p className="text-sm text-slate-500">No transactions recorded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {milestone.transactions
        .slice()
        .sort((a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime())
        .map((tx) => (
          <li key={`${tx.kind}-${tx.txHash}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tx.kind}</p>
              <p className="truncate font-mono text-xs font-semibold text-slate-700">
                {truncateHash(tx.txHash)}
              </p>
            </div>
            <a
              href={tx.txUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              View <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
    </ol>
  );
}

function KV({
  label,
  value,
  mono,
  tone = 'slate',
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'slate' | 'emerald';
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-xs font-semibold ${
          mono ? 'font-mono' : ''
        } ${tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}

function StreamPanel({ grant }: { grant: DaoGrantCardModel }) {
  // PRD: setInterval 100ms increments between polls.
  const [total, setTotal] = useState(() => computeStreamTotal(grant));
  const incrementPerTick = useMemo(() => grant.streamRateUsdcPerSec * 0.1, [grant.streamRateUsdcPerSec]);

  useEffect(() => {
    const id = window.setInterval(() => setTotal((t) => t + incrementPerTick), 100);
    return () => window.clearInterval(id);
  }, [incrementPerTick]);

  return (
    <div className="border-t border-slate-200 bg-slate-900 px-4 py-4 text-white sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Sablier stream active</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
            ${total.toFixed(6)}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Started {formatDateTime(grant.createdAtIso)}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Stream Active
          </span>
          <p className="mt-3 font-mono text-xs text-slate-200">
            {grant.streamRateUsdcPerSec.toFixed(6)} USDC/sec
          </p>
        </div>
      </div>
    </div>
  );
}

function computeStreamTotal(g: DaoGrantCardModel): number {
  const elapsedSec = (Date.now() - g.streamEpochMs) / 1000;
  return g.streamAccumulatedUsdcAtEpoch + elapsedSec * g.streamRateUsdcPerSec;
}

function truncateAddress(addr: `0x${string}`): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function truncateHash(hash: `0x${string}`): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return `${date} • ${time} UTC`;
}

function dotTone(status: DaoMilestoneModel['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500';
    case 'warning_issued':
      return 'bg-amber-500';
    case 'slashed':
      return 'bg-slate-900';
    case 'overdue':
      return 'bg-red-500';
    case 'pending':
    default:
      return 'bg-sky-500';
  }
}

function statusLabel(status: DaoMilestoneModel['status']): string {
  switch (status) {
    case 'approved':
      return 'Completed';
    case 'warning_issued':
      return 'Warning';
    case 'slashed':
      return 'Slashed';
    case 'overdue':
      return 'Overdue';
    case 'pending':
    default:
      return 'Pending';
  }
}

function statusIcon(status: DaoMilestoneModel['status']) {
  switch (status) {
    case 'approved':
      return <FileCheck2 className="h-3 w-3" aria-hidden />;
    case 'warning_issued':
      return <Gavel className="h-3 w-3" aria-hidden />;
    case 'slashed':
      return <Gavel className="h-3 w-3" aria-hidden />;
    case 'overdue':
      return <Clock className="h-3 w-3" aria-hidden />;
    case 'pending':
    default:
      return <ShieldCheck className="h-3 w-3" aria-hidden />;
  }
}

function statusPillTone(status: DaoMilestoneModel['status']): string {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning_issued':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'slashed':
      return 'border-slate-900 bg-slate-900 text-white';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'pending':
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

