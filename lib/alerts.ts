import { isUiDemoMode } from '@/demo';
import type { DaoDashboardSnapshot } from '@/demo/dao-dashboard';
import { letterGradeFromScore } from '@/demo/dao-dashboard';
import { CONTRACTS_READY } from '@/lib/escrow';
import { grantDetailPath } from '@/lib/grant-routes';
import { builderProfilePath } from '@/lib/profile-address';
import type { Address } from 'viem';

export type DaoAlertSeverity = 'critical' | 'urgent' | 'watch';

export type DaoAlertCategory =
  | 'committee_inactivity'
  | 'builder_reputation_critical'
  | 'treasury_threshold'
  | 'unwarned_overdue'
  | 'committee_member_inactive';

export type DaoAlertAction =
  | { kind: 'link'; label: string; href: string }
  | { kind: 'scroll'; label: string; targetId: string };

export type DaoAlert = {
  id: string;
  category: DaoAlertCategory;
  severity: DaoAlertSeverity;
  /** Short label shown above the message, e.g. "Builder Reputation Critical" */
  title: string;
  message: string;
  /** When the underlying condition first became true (epoch ms). */
  conditionSinceMs: number;
  action: DaoAlertAction;
};

export type DaoAlertsInput = {
  snapshot: DaoDashboardSnapshot;
  /** Optional on-chain grant rows — wired when escrow multicall ships. */
  chainGrants?: ChainGrantAlertContext[];
  /** Optional reputation by builder — wired from ReputationRegistry. */
  builderReputation?: Map<string, number>;
};

export type ChainGrantAlertContext = {
  grantId: bigint;
  builder: Address;
  committeeAddresses: Address[];
  milestones: {
    title: string;
    status: number;
    deadlineSec: bigint;
    hasWarning: boolean;
    lastVoteAtSec?: bigint;
    lastWarningAtSec?: bigint;
    submittedAtSec?: bigint;
    votesByMember?: Map<string, bigint>;
  }[];
};

const MS_PER_DAY = 86_400_000;
const COMMITTEE_INACTIVITY_DAYS = 7;
const MEMBER_INACTIVE_DAYS = 14;
const REPUTATION_CRITICAL_MAX = 40;

export const TREASURY_ALERT_THRESHOLD_USDC = Number(
  process.env.NEXT_PUBLIC_TREASURY_ALERT_THRESHOLD ??
    process.env.NEXT_PUBLIC_TREASURY_ALERT_USDC_THRESHOLD ??
    '5000000',
);

const SEVERITY_ORDER: Record<DaoAlertSeverity, number> = {
  critical: 0,
  urgent: 1,
  watch: 2,
};

/** Demo-only committee activity metadata until on-chain reads land. */
/** Slugs must exist on `demo/dao-dashboard.ts` catalogue for grant detail resolution. */
const DEMO_COMMITTEE_FIXTURES: {
  grantSlug: string;
  grantNumericId: string;
  inactiveDays: number;
  submittedAwaiting: number;
  conditionSinceMs: number;
}[] = [
  {
    grantSlug: '8692',
    grantNumericId: '8692',
    inactiveDays: 8,
    submittedAwaiting: 2,
    conditionSinceMs: Date.now() - MS_PER_DAY,
  },
];

const DEMO_MEMBER_INACTIVE_FIXTURES: {
  grantSlug: string;
  grantNumericId: string;
  member: `0x${string}`;
  inactiveDays: number;
  conditionSinceMs: number;
}[] = [
  {
    grantSlug: '7731',
    grantNumericId: '7731',
    member: '0x1Ab43e5cF0123Ee9d8C4B2A0bE1FFcD12Aa9F022',
    inactiveDays: 15,
    conditionSinceMs: Date.now() - 3 * MS_PER_DAY,
  },
];

/** Demo ledger builder with reputationScore 12 (`#GRT-6102`). */
const DEMO_REPUTATION_FIXTURE: {
  builder: `0x${string}`;
  score: number;
  activeGrants: number;
  conditionSinceMs: number;
} = {
  builder: '0x2F8a3C4D5E6F7a8B9C0D1E2F3a4B5C6D7E8F9a0B',
  score: 12,
  activeGrants: 1,
  conditionSinceMs: Date.now() - 2 * 60 * 60 * 1000,
};

/**
 * Produce DAO oversight alerts from escrow + reputation inputs.
 * Demo mode enriches with fixture rows that match the UX Pilot dashboard.
 */
export function generateDaoAlerts(input: DaoAlertsInput): DaoAlert[] {
  const alerts: DaoAlert[] = [];
  const now = Date.now();

  alerts.push(...treasuryAlerts(input.snapshot, now));
  alerts.push(...reputationAlerts(input.snapshot, input.builderReputation, now));
  alerts.push(...unwarnedOverdueAlerts(input.snapshot, now));

  if (input.chainGrants?.length) {
    alerts.push(...committeeInactivityFromChain(input.chainGrants, now));
    alerts.push(...memberInactiveFromChain(input.chainGrants, now));
  }
  if (!input.chainGrants?.length && (isUiDemoMode() || !CONTRACTS_READY)) {
    alerts.push(...demoCommitteeAlerts(now));
  }

  return sortDaoAlerts(dedupeAlerts(alerts));
}

export function sortDaoAlerts(alerts: DaoAlert[]): DaoAlert[] {
  return [...alerts].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return a.conditionSinceMs - b.conditionSinceMs;
  });
}

export function formatAlertDuration(conditionSinceMs: number, nowMs = Date.now()): string {
  const elapsed = Math.max(0, nowMs - conditionSinceMs);
  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  if (hours < 24) {
    return hours <= 1 ? 'for 1 hour' : `for ${hours} hours`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'for 1 day' : `for ${days} days`;
}

export function shortenAlertAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

function dedupeAlerts(alerts: DaoAlert[]): DaoAlert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function treasuryAlerts(snapshot: DaoDashboardSnapshot, now: number): DaoAlert[] {
  const locked = snapshot.hero.totalUsdcLocked;
  const threshold = TREASURY_ALERT_THRESHOLD_USDC;
  if (threshold <= 0 || locked < threshold * 0.8) return [];

  const utilisationPct = Math.min(100, Math.round((locked / threshold) * 100));
  const activeGrants = snapshot.hero.activeGrants;

  return [
    {
      id: `treasury:${locked}:${activeGrants}`,
      category: 'treasury_threshold',
      severity: 'critical',
      title: 'Treasury Threshold Exceeded',
      message: `Treasury utilisation at ${utilisationPct}% — ${formatUsdCompact(locked)} currently locked across ${activeGrants} grants.`,
      conditionSinceMs: now - 5 * 60 * 60 * 1000,
      action: { kind: 'scroll', label: 'View Treasury →', targetId: 'dao-treasury-panel' },
    },
  ];
}

function reputationAlerts(
  snapshot: DaoDashboardSnapshot,
  reputationMap: Map<string, number> | undefined,
  now: number,
): DaoAlert[] {
  const alerts: DaoAlert[] = [];
  const byBuilder = new Map<string, { score: number; grants: number }>();

  for (const grant of snapshot.grants) {
    const key = grant.builder.toLowerCase();
    const score = reputationMap?.get(key) ?? grant.reputationScore;
    const prev = byBuilder.get(key);
    if (prev) {
      prev.grants += 1;
      prev.score = Math.min(prev.score, score);
    } else {
      byBuilder.set(key, { score, grants: 1 });
    }
  }

  for (const [builder, { score, grants }] of byBuilder) {
    if (score >= REPUTATION_CRITICAL_MAX) continue;
    alerts.push({
      id: `reputation:${builder}`,
      category: 'builder_reputation_critical',
      severity: 'critical',
      title: 'Builder Reputation Critical',
      message: `Builder ${shortenAlertAddress(builder)} reputation score is ${letterGradeFromScore(score)} (${score}) — ${grants} active grant${grants === 1 ? '' : 's'} affected.`,
      conditionSinceMs: now - 4 * 60 * 60 * 1000,
      action: {
        kind: 'link',
        label: 'View Profile →',
        href: builderProfilePath(builder) ?? '/grants',
      },
    });
  }

  if (isUiDemoMode()) {
    const f = DEMO_REPUTATION_FIXTURE;
    const demoId = `reputation:demo:${f.builder.toLowerCase()}`;
    if (!alerts.some((a) => a.id === demoId)) {
      alerts.push({
        id: demoId,
        category: 'builder_reputation_critical',
        severity: 'critical',
        title: 'Builder Reputation Critical',
        message: `Builder ${shortenAlertAddress(f.builder)} reputation score is F (${f.score}) — ${f.activeGrants} active grants affected.`,
        conditionSinceMs: f.conditionSinceMs,
        action: {
          kind: 'link',
          label: 'View Profile →',
          href: builderProfilePath(f.builder) ?? '/grants',
        },
      });
    }
  }

  return alerts;
}

function unwarnedOverdueAlerts(snapshot: DaoDashboardSnapshot, now: number): DaoAlert[] {
  const alerts: DaoAlert[] = [];

  for (const grant of snapshot.grants) {
    for (const m of grant.milestones) {
      if (m.status !== 'overdue') continue;
      if (m.warningHistory.length > 0) continue;
      const deadline = new Date(m.deadlineIso).getTime();
      if (deadline >= now) continue;
      const days = Math.max(1, Math.floor((now - deadline) / MS_PER_DAY));
      alerts.push({
        id: `overdue:${grant.slug}:${m.index}`,
        category: 'unwarned_overdue',
        severity: 'urgent',
        title: 'Unwarned Overdue Milestone',
        message: `Grant #${grant.slug} — ${m.title} is ${days} day${days === 1 ? '' : 's'} overdue with no warning issued.`,
        conditionSinceMs: deadline,
        action: {
          kind: 'link',
          label: 'View Grant →',
          href: grantDetailPath(grant.slug, 'dao'),
        },
      });
    }
  }

  return alerts;
}

function demoCommitteeAlerts(now: number): DaoAlert[] {
  const alerts: DaoAlert[] = [];

  for (const row of DEMO_COMMITTEE_FIXTURES) {
    alerts.push({
      id: `committee-inactivity:${row.grantSlug}`,
      category: 'committee_inactivity',
      severity: 'urgent',
      title: 'Committee Inactivity',
      message: `Grant #${row.grantNumericId} — no committee activity in ${row.inactiveDays} days. ${row.submittedAwaiting} milestones awaiting review.`,
      conditionSinceMs: row.conditionSinceMs,
      action: {
        kind: 'link',
        label: 'View Grant →',
        href: grantDetailPath(row.grantSlug, 'dao'),
      },
    });
  }

  for (const row of DEMO_MEMBER_INACTIVE_FIXTURES) {
    alerts.push({
      id: `member-inactive:${row.grantSlug}:${row.member}`,
      category: 'committee_member_inactive',
      severity: 'watch',
      title: 'Committee Member Gone Inactive',
      message: `Committee member ${shortenAlertAddress(row.member)} on Grant #${row.grantNumericId} has been inactive for ${row.inactiveDays} days.`,
      conditionSinceMs: row.conditionSinceMs,
      action: {
        kind: 'link',
        label: 'View Grant →',
        href: grantDetailPath(row.grantSlug, 'dao'),
      },
    });
  }

  return alerts;
}

function committeeInactivityFromChain(grants: ChainGrantAlertContext[], now: number): DaoAlert[] {
  const alerts: DaoAlert[] = [];
  const inactivityMs = COMMITTEE_INACTIVITY_DAYS * MS_PER_DAY;

  for (const grant of grants) {
    const submitted = grant.milestones.filter((m) => m.submittedAtSec && m.submittedAtSec > BigInt(0));
    if (submitted.length === 0) continue;

    const lastActivity = grant.milestones.reduce((max, m) => {
      const vote = m.lastVoteAtSec ? Number(m.lastVoteAtSec) * 1000 : 0;
      const warn = m.lastWarningAtSec ? Number(m.lastWarningAtSec) * 1000 : 0;
      return Math.max(max, vote, warn);
    }, 0);

    if (lastActivity === 0 || now - lastActivity < inactivityMs) continue;

    const days = Math.floor((now - lastActivity) / MS_PER_DAY);
    alerts.push({
      id: `committee-inactivity:${grant.grantId}`,
      category: 'committee_inactivity',
      severity: 'urgent',
      title: 'Committee Inactivity',
      message: `Grant #${grant.grantId.toString()} — no committee activity in ${days} days. ${submitted.length} milestone${submitted.length === 1 ? '' : 's'} awaiting review.`,
      conditionSinceMs: lastActivity,
      action: {
        kind: 'link',
        label: 'View Grant →',
        href: grantDetailPath(grant.grantId.toString(), 'dao'),
      },
    });
  }

  return alerts;
}

function memberInactiveFromChain(grants: ChainGrantAlertContext[], now: number): DaoAlert[] {
  const alerts: DaoAlert[] = [];
  const inactiveMs = MEMBER_INACTIVE_DAYS * MS_PER_DAY;

  for (const grant of grants) {
    if (grant.committeeAddresses.length < 2) continue;

    for (const member of grant.committeeAddresses) {
      const key = member.toLowerCase();
      let memberLastVote = 0;
      let anyOtherActive = false;

      for (const m of grant.milestones) {
        const votes = m.votesByMember;
        if (!votes) continue;
        const ts = votes.get(key);
        if (ts) memberLastVote = Math.max(memberLastVote, Number(ts) * 1000);
        for (const [voter, at] of votes) {
          if (voter !== key && now - Number(at) * 1000 < inactiveMs) {
            anyOtherActive = true;
          }
        }
      }

      if (!anyOtherActive || memberLastVote === 0) continue;
      if (now - memberLastVote >= inactiveMs) {
        const days = Math.floor((now - memberLastVote) / MS_PER_DAY);
        alerts.push({
          id: `member-inactive:${grant.grantId}:${key}`,
          category: 'committee_member_inactive',
          severity: 'watch',
          title: 'Committee Member Gone Inactive',
          message: `Committee member ${shortenAlertAddress(member)} on Grant #${grant.grantId.toString()} has been inactive for ${days} days.`,
          conditionSinceMs: memberLastVote,
          action: {
            kind: 'link',
            label: 'View Grant →',
            href: grantDetailPath(grant.grantId.toString(), 'dao'),
          },
        });
      }
    }
  }

  return alerts;
}

function formatUsdCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Highest severity among active alerts — drives header badge tone. */
export function highestAlertSeverity(alerts: DaoAlert[]): DaoAlertSeverity | null {
  if (alerts.length === 0) return null;
  return sortDaoAlerts(alerts)[0]!.severity;
}
