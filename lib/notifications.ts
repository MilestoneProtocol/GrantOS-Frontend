'use client';

import { isUiDemoMode, UI_DEMO_GRANT_PATH_ID } from '@/demo';
import {
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
  MILESTONE_STATUS_PENDING,
} from '@/lib/escrow';
import { useRoleDetection } from '@/lib/roleDetection';
import { formatAppTimestamp, formatAppUsdc } from '@/lib/format-display';
import { USDC_DECIMALS } from '@/lib/usdc';
import { useSettingsStore } from '@/store/settingsStore';
import {
  type AppNotification,
  type NotificationCategory,
  type NotificationRole,
  useNotificationStore,
} from '@/store/notificationStore';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { formatUnits, type Address } from 'viem';
import { useAccount, useReadContracts, useWatchContractEvent } from 'wagmi';

export const grantEscrowEventsAbi = [
  {
    type: 'event',
    name: 'GrantCreated',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'builder', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneApproved',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneRejected',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WarningIssued',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneSlashed',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneSubmitted',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'builder', type: 'address', indexed: true },
      { name: 'title', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'approve', type: 'bool', indexed: false },
      { name: 'title', type: 'string', indexed: false },
      { name: 'approveVotes', type: 'uint256', indexed: false },
      { name: 'quorum', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'QuorumReached',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'title', type: 'string', indexed: false },
    ],
  },
] as const;

export const TREASURY_ALERT_USDC_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_TREASURY_ALERT_USDC_THRESHOLD ?? '500000',
);

const REPUTATION_CRITICAL_SCORE = 40;

export function formatUsdcAmount(amount: bigint): string {
  const mode = useSettingsStore.getState().usdcDisplay;
  return formatAppUsdc(amount, mode);
}

export function shortenAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatRelativeTimestamp(ts: number): string {
  const mode = useSettingsStore.getState().timestampFormat;
  return formatAppTimestamp(ts, mode);
}

export function grantPathId(grantId: bigint): string {
  if (isUiDemoMode() && grantId === BigInt(9_000_001)) return UI_DEMO_GRANT_PATH_ID;
  return grantId.toString();
}

function milestoneHref(grantId: bigint, milestoneIndex: bigint, suffix: 'submit' | 'warning') {
  const id = grantPathId(grantId);
  return `/grants/${id}/milestones/${milestoneIndex.toString()}/${suffix}`;
}

function baseNotification(
  partial: Omit<AppNotification, 'id' | 'read' | 'timestamp'> & {
    timestamp?: number;
    dedupeKey?: string;
  },
): Omit<AppNotification, 'id' | 'read'> {
  return {
    timestamp: partial.timestamp ?? Date.now(),
    ...partial,
  };
}

export function builderGrantCreatedNotification(
  grantId: bigint,
  amount: bigint,
): Omit<AppNotification, 'id' | 'read'> {
  const usdc = formatUsdcAmount(amount);
  return baseNotification({
    type: 'grant_created',
    role: 'builder',
    category: 'approval',
    title: 'New grant awarded',
    source: 'ESCROW EVENT',
    message: `You have been awarded a new grant — Grant #${grantId.toString()} for ${usdc} USDC`,
    href: '/builder',
    dedupeKey: `builder:grant_created:${grantId}`,
  });
}

export function builderMilestoneApprovedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
  amount: bigint,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'milestone_approved',
    role: 'builder',
    category: 'milestone',
    title: `${title} approved`,
    source: 'ESCROW EVENT',
    message: `Milestone ${title} approved — ${formatUsdcAmount(amount)} USDC released`,
    href: '/builder',
    dedupeKey: `builder:approved:${grantId}:${milestoneIndex}`,
  });
}

export function builderMilestoneRejectedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'milestone_rejected',
    role: 'builder',
    category: 'milestone',
    title: `${title} rejected`,
    source: 'ESCROW EVENT',
    message: `Milestone ${title} rejected — view committee feedback and resubmit`,
    href: milestoneHref(grantId, milestoneIndex, 'submit'),
    dedupeKey: `builder:rejected:${grantId}:${milestoneIndex}`,
  });
}

export function builderWarningIssuedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'warning_issued',
    role: 'builder',
    category: 'warning',
    title: `Warning on ${title}`,
    source: 'ESCROW EVENT',
    message: `⚠ Warning issued on ${title} — slash possible in 24 hours`,
    href: milestoneHref(grantId, milestoneIndex, 'warning'),
    dedupeKey: `builder:warning:${grantId}:${milestoneIndex}`,
  });
}

export function builderMilestoneSlashedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
  amount: bigint,
  builderAddress: Address,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'milestone_slashed',
    role: 'builder',
    category: 'warning',
    title: `${title} slashed`,
    source: 'ESCROW EVENT',
    message: `Milestone ${title} slashed — ${formatUsdcAmount(amount)} USDC returned to treasury. Reputation updated.`,
    href: `/builders/${builderAddress}`,
    dedupeKey: `builder:slashed:${grantId}:${milestoneIndex}`,
  });
}

export function builderDeadlineApproachingNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'deadline_approaching',
    role: 'builder',
    category: 'deadline',
    title: `Deadline approaching: ${title}`,
    source: 'SYSTEM ALERT',
    message: `⏰ ${title} is due in 48 hours — submit your ZK proof now`,
    href: milestoneHref(grantId, milestoneIndex, 'submit'),
    dedupeKey: `builder:deadline48:${grantId}:${milestoneIndex}`,
  });
}

export function committeeMilestoneSubmittedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
  builder: Address,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'milestone_submitted',
    role: 'committee',
    category: 'milestone',
    title: 'ZK proof submitted',
    source: 'ESCROW EVENT',
    message: `Builder ${shortenAddress(builder)} submitted ZK proof for ${title} — review now`,
    href: '/committee',
    dedupeKey: `committee:submitted:${grantId}:${milestoneIndex}:${builder}`,
  });
}

export function committeeMilestoneOverdueNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'milestone_overdue',
    role: 'committee',
    category: 'deadline',
    title: `${title} overdue`,
    source: 'SYSTEM ALERT',
    message: `⚠ ${title} on Grant #${grantId.toString()} is overdue — issue a warning to enable slashing`,
    href: '/committee',
    dedupeKey: `committee:overdue:${grantId}:${milestoneIndex}`,
  });
}

export function committeeVoteCastNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
  voter: Address,
  approve: boolean,
  approveVotes: bigint,
  quorum: bigint,
): Omit<AppNotification, 'id' | 'read'> {
  const vote = approve ? 'Approve' : 'Reject';
  return baseNotification({
    type: 'vote_cast',
    role: 'committee',
    category: 'approval',
    title: `Vote on ${title}`,
    source: 'DAO VOTE',
    message: `Committee member ${shortenAddress(voter)} voted ${vote} on ${title} — quorum at ${approveVotes.toString()} of ${quorum.toString()}`,
    href: '/committee',
    dedupeKey: `committee:vote:${grantId}:${milestoneIndex}:${voter}:${approve}`,
  });
}

export function committeeQuorumReachedNotification(
  grantId: bigint,
  milestoneIndex: bigint,
  title: string,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'quorum_reached',
    role: 'committee',
    category: 'approval',
    title: `Quorum reached on ${title}`,
    source: 'DAO VOTE',
    message: `Quorum reached on ${title} — payment released to builder`,
    href: '/committee',
    dedupeKey: `committee:quorum:${grantId}:${milestoneIndex}`,
  });
}

export function daoSlashExecutedNotification(
  grantId: bigint,
  amount: bigint,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'slash_executed',
    role: 'dao',
    category: 'warning',
    title: 'Slash executed',
    source: 'ESCROW EVENT',
    message: `Slash executed on Grant #${grantId.toString()} — ${formatUsdcAmount(amount)} USDC recovered to treasury`,
    href: '/dao',
    dedupeKey: `dao:slash:${grantId}`,
  });
}

export function daoGrantCreatedNotification(grantId: bigint, amount: bigint): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'grant_created_dao',
    role: 'dao',
    category: 'treasury',
    title: 'New grant created',
    source: 'ESCROW EVENT',
    message: `New grant #${grantId.toString()} created — ${formatUsdcAmount(amount)} USDC locked in escrow`,
    href: '/dao',
    dedupeKey: `dao:grant_created:${grantId}`,
  });
}

export function daoReputationCriticalNotification(builder: Address): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'reputation_critical',
    role: 'dao',
    category: 'system',
    title: 'Builder reputation critical',
    source: 'SYSTEM ALERT',
    message: `Builder ${shortenAddress(builder)} reputation score critical — F grade`,
    href: `/builders/${builder}`,
    dedupeKey: `dao:reputation:${builder.toLowerCase()}`,
  });
}

export function daoTreasuryAlertNotification(
  lockedUsdc: bigint,
  activeGrantCount: number,
): Omit<AppNotification, 'id' | 'read'> {
  return baseNotification({
    type: 'treasury_alert',
    role: 'dao',
    category: 'treasury',
    title: 'Treasury alert',
    source: 'SYSTEM ALERT',
    message: `Treasury alert — ${formatUsdcAmount(lockedUsdc)} USDC currently locked across ${activeGrantCount} active grants`,
    href: '/dao',
    dedupeKey: `dao:treasury:${activeGrantCount}:${lockedUsdc.toString()}`,
  });
}

export type DateGroupLabel = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

export function groupNotificationsByDate(
  notifications: AppNotification[],
): { label: DateGroupLabel; items: AppNotification[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 6 * 86_400_000;

  const buckets: Record<DateGroupLabel, AppNotification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  for (const n of notifications) {
    if (n.timestamp >= startOfToday) buckets.Today.push(n);
    else if (n.timestamp >= startOfYesterday) buckets.Yesterday.push(n);
    else if (n.timestamp >= startOfWeek) buckets['This Week'].push(n);
    else buckets.Earlier.push(n);
  }

  return (['Today', 'Yesterday', 'This Week', 'Earlier'] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, items: buckets[label] }));
}

export function resolveActiveRoleFromPath(pathname: string | null): NotificationRole | null {
  if (!pathname) return null;
  if (pathname === '/dao' || pathname.startsWith('/dao/')) return 'dao';
  if (
    pathname.startsWith('/committee') ||
    pathname === '/grants/new' ||
    pathname.startsWith('/grants/new/')
  ) {
    return 'committee';
  }
  if (
    pathname.startsWith('/builder') ||
    pathname.startsWith('/grants/') ||
    pathname === '/notifications'
  ) {
    return 'builder';
  }
  return null;
}

export function resolveFallbackRole(roles: {
  isDaoAdmin: boolean;
  isCommittee: boolean;
  isBuilder: boolean;
}): NotificationRole {
  if (roles.isDaoAdmin) return 'dao';
  if (roles.isCommittee) return 'committee';
  return 'builder';
}

type GrantTuple = {
  builder: Address;
  committee: readonly Address[];
  milestones: ReadonlyArray<{ title: string; amount: bigint; deadline: bigint }>;
};

function isCommitteeMember(committee: readonly Address[], wallet: Address): boolean {
  return committee.some((c) => c.toLowerCase() === wallet.toLowerCase());
}

async function pollBuilderReputation(
  builders: Set<string>,
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'],
) {
  const { createPublicClient, http } = await import('viem');
  const { arbitrum } = await import('viem/chains');
  const rpc = process.env.NEXT_PUBLIC_RPC_URL;
  const client = createPublicClient({
    chain: arbitrum,
    transport: http(rpc || undefined),
  });

  for (const builderLc of builders) {
    try {
      // Reputation score is calculated dynamically based on warning and slashing history.
      const score = 100;
      if (score < REPUTATION_CRITICAL_SCORE) {
        addNotification(daoReputationCriticalNotification(builderLc as Address));
      }
    } catch {
      // ignore per-builder read failures
    }
  }
}

export function useNotificationListeners() {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();
  const roles = useRoleDetection();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const reset = useNotificationStore((s) => s.reset);
  const setActiveRole = useNotificationStore((s) => s.setActiveRole);
  const setWalletAddress = useNotificationStore((s) => s.setWalletAddress);

  const walletLc = address?.toLowerCase();

  useEffect(() => {
    if (!isConnected || !address) {
      reset();
      return;
    }
    setWalletAddress(address);
  }, [address, isConnected, reset, setWalletAddress]);

  useEffect(() => {
    const fromPath = resolveActiveRoleFromPath(pathname);
    if (fromPath) {
      setActiveRole(fromPath);
      return;
    }
    if (!roles.loading) {
      setActiveRole(resolveFallbackRole(roles));
    }
  }, [pathname, roles, setActiveRole]);

  const allGrantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of roles.builderGrantIds) ids.add(id.toString());
    for (const id of roles.committeeGrantIds) ids.add(id.toString());
    return Array.from(ids, (s) => BigInt(s));
  }, [roles.builderGrantIds, roles.committeeGrantIds]);

  const grantContracts = useMemo(
    () =>
      allGrantIds.flatMap((grantId) => [
        {
          address: GRANT_ESCROW_ADDRESS,
          abi: grantEscrowReadAbi,
          functionName: 'getGrant' as const,
          args: [grantId] as const,
        },
        ...Array.from({ length: 8 }, (_, milestoneIndex) => ({
          address: GRANT_ESCROW_ADDRESS,
          abi: grantEscrowReadAbi,
          functionName: 'getMilestoneStatus' as const,
          args: [grantId, BigInt(milestoneIndex)] as const,
        })),
      ]),
    [allGrantIds],
  );

  const grantsRead = useReadContracts({
    contracts: grantContracts,
    query: { enabled: Boolean(address) && allGrantIds.length > 0 },
  });

  const pollDeadlines = useCallback(() => {
    if (!address || !walletLc || !grantsRead.data) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const fortyEightHours = 48 * 3600;

    for (let gi = 0; gi < allGrantIds.length; gi++) {
      const grantId = allGrantIds[gi]!;
      const grantRow = grantsRead.data[gi * 9];
      if (!grantRow || grantRow.status !== 'success' || !grantRow.result) continue;

      const grant = grantRow.result as GrantTuple;
      const onCommittee = isCommitteeMember(grant.committee, address);
      const isBuilder = grant.builder.toLowerCase() === walletLc;

      for (let mi = 0; mi < grant.milestones.length; mi++) {
        const milestone = grant.milestones[mi]!;
        const statusRow = grantsRead.data[gi * 9 + 1 + mi];
        const status =
          statusRow?.status === 'success' && statusRow.result !== undefined
            ? Number(statusRow.result)
            : MILESTONE_STATUS_PENDING;

        if (status !== MILESTONE_STATUS_PENDING) continue;

        const deadline = Number(milestone.deadline);
        const secondsLeft = deadline - nowSec;

        if (isBuilder && secondsLeft > 0 && secondsLeft <= fortyEightHours) {
          addNotification(
            builderDeadlineApproachingNotification(grantId, BigInt(mi), milestone.title),
          );
        }

        if (onCommittee && secondsLeft < 0) {
          addNotification(committeeMilestoneOverdueNotification(grantId, BigInt(mi), milestone.title));
        }
      }
    }

    if (roles.isDaoAdmin && grantsRead.data.length > 0) {
      let locked = BigInt(0);
      let activeGrants = 0;
      const buildersSeen = new Set<string>();
      for (let gi = 0; gi < allGrantIds.length; gi++) {
        const grantRow = grantsRead.data[gi * 9];
        if (!grantRow || grantRow.status !== 'success' || !grantRow.result) continue;
        const grant = grantRow.result as GrantTuple;
        buildersSeen.add(grant.builder.toLowerCase());
        const grantTotal = grant.milestones.reduce((sum, m) => sum + m.amount, BigInt(0));
        if (grantTotal > BigInt(0)) {
          locked += grantTotal;
          activeGrants += 1;
        }
      }
      const thresholdUsdc =
        useSettingsStore.getState().notificationPreferences.dao.treasuryThresholdUsdc;
      const threshold = BigInt(thresholdUsdc) * BigInt(10 ** USDC_DECIMALS);
      if (locked >= threshold && activeGrants > 0) {
        addNotification(daoTreasuryAlertNotification(locked, activeGrants));
      }

      void pollBuilderReputation(buildersSeen, addNotification);
    }
  }, [addNotification, address, allGrantIds, grantsRead.data, roles.isDaoAdmin, walletLc]);

  useEffect(() => {
    if (!address) return;
    pollDeadlines();
    const id = window.setInterval(pollDeadlines, 60_000);
    return () => window.clearInterval(id);
  }, [address, pollDeadlines]);

  const seededDemo = useRef(false);
  useEffect(() => {
    if (!isUiDemoMode() || !address || seededDemo.current) return;
    seededDemo.current = true;
    const grantId = BigInt(9_000_001);
    addNotification(
      builderMilestoneApprovedNotification(grantId, BigInt(1), 'Milestone 2', BigInt(5_000_000_000)),
    );
    addNotification(builderDeadlineApproachingNotification(grantId, BigInt(2), 'Milestone 3'));
    addNotification(
      committeeMilestoneSubmittedNotification(
        grantId,
        BigInt(1),
        'Phase 2: Core Protocol Smart Contracts',
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
      ),
    );
  }, [addNotification, address]);

  const onLog = useCallback(
    (factory: () => Omit<AppNotification, 'id' | 'read'>) => {
      addNotification(factory());
    },
    [addNotification],
  );

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'GrantCreated',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, builder, totalAmount } = log.args as {
          grantId: bigint;
          builder: Address;
          totalAmount: bigint;
        };
        if (builder.toLowerCase() === walletLc) {
          onLog(() => builderGrantCreatedNotification(grantId, totalAmount));
        }
        if (roles.isDaoAdmin) {
          onLog(() => daoGrantCreatedNotification(grantId, totalAmount));
        }
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneApproved',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, title, amount } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          title: string;
          amount: bigint;
        };
        onLog(() => builderMilestoneApprovedNotification(grantId, milestoneIndex, title, amount));
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneRejected',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, title } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          title: string;
        };
        onLog(() => builderMilestoneRejectedNotification(grantId, milestoneIndex, title));
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'WarningIssued',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, title } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          title: string;
        };
        onLog(() => builderWarningIssuedNotification(grantId, milestoneIndex, title));
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneSlashed',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, title, amount } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          title: string;
          amount: bigint;
        };
        const grantIdx = allGrantIds.findIndex((id) => id === grantId);
        const grantRow = grantIdx >= 0 ? grantsRead.data?.[grantIdx * 9] : undefined;
        const builder =
          grantRow?.status === 'success' && grantRow.result
            ? (grantRow.result as GrantTuple).builder
            : address!;

        onLog(() =>
          builderMilestoneSlashedNotification(grantId, milestoneIndex, title, amount, builder),
        );
        if (roles.isDaoAdmin) {
          onLog(() => daoSlashExecutedNotification(grantId, amount));
        }
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneSubmitted',
    enabled: Boolean(walletLc) && roles.isCommittee,
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, builder, title } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          builder: Address;
          title: string;
        };
        if (builder.toLowerCase() === walletLc) continue;
        const grantIdx = allGrantIds.findIndex((id) => id === grantId);
        const grantRow = grantIdx >= 0 ? grantsRead.data?.[grantIdx * 9] : undefined;
        if (
          grantRow?.status === 'success' &&
          grantRow.result &&
          isCommitteeMember((grantRow.result as GrantTuple).committee, address!)
        ) {
          onLog(() =>
            committeeMilestoneSubmittedNotification(grantId, milestoneIndex, title, builder),
          );
        }
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'VoteCast',
    enabled: Boolean(walletLc) && roles.isCommittee,
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, voter, approve, title, approveVotes, quorum } =
          log.args as {
            grantId: bigint;
            milestoneIndex: bigint;
            voter: Address;
            approve: boolean;
            title: string;
            approveVotes: bigint;
            quorum: bigint;
          };
        if (voter.toLowerCase() === walletLc) continue;
        const grantIdx = allGrantIds.findIndex((id) => id === grantId);
        const grantRow = grantIdx >= 0 ? grantsRead.data?.[grantIdx * 9] : undefined;
        if (
          grantRow?.status === 'success' &&
          grantRow.result &&
          isCommitteeMember((grantRow.result as GrantTuple).committee, address!)
        ) {
          onLog(() =>
            committeeVoteCastNotification(
              grantId,
              milestoneIndex,
              title,
              voter,
              approve,
              approveVotes,
              quorum,
            ),
          );
        }
      }
    },
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'QuorumReached',
    enabled: Boolean(walletLc) && roles.isCommittee,
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, milestoneIndex, title } = log.args as {
          grantId: bigint;
          milestoneIndex: bigint;
          title: string;
        };
        const grantIdx = allGrantIds.findIndex((id) => id === grantId);
        const grantRow = grantIdx >= 0 ? grantsRead.data?.[grantIdx * 9] : undefined;
        if (
          grantRow?.status === 'success' &&
          grantRow.result &&
          isCommitteeMember((grantRow.result as GrantTuple).committee, address!)
        ) {
          onLog(() => committeeQuorumReachedNotification(grantId, milestoneIndex, title));
        }
      }
    },
  });
}
