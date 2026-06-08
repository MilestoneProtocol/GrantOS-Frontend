'use client';

import {
  escrowLifecycleEventsAbi,
  escrowMetaAbi,
  factoryGrantCreatedEventsAbi,
  GRANT_FACTORY_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
  MILESTONE_STATUS_PENDING,
  sentinelWarningEventsAbi,
} from '@/lib/escrow';

/**
 * Minimal factory ABI: `grants(grantId) → escrowAddress`. Grants are deployed
 * as one escrow contract per grant, so we resolve each grant's escrow from the
 * factory (the on-chain `grantId` is the factory index) before reading it.
 */
const factoryGrantsAbi = [
  {
    type: 'function',
    name: 'grants',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
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
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
} from 'wagmi';

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
  if (pathname === '/dao' || pathname.startsWith('/dao/')) {
    return 'dao';
  }
  if (
    pathname.startsWith('/committee') ||
    pathname === '/tasks' ||
    pathname.startsWith('/tasks/') ||
    pathname === '/grants/new' ||
    pathname.startsWith('/grants/new/')
  ) {
    return 'committee';
  }
  if (pathname.startsWith('/builder') || pathname.startsWith('/grants/')) {
    return 'builder';
  }
  // `/notifications` is role-agnostic — fall back to wallet roles in the listener.
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
  quorum: bigint;
  milestones: ReadonlyArray<{
    title: string;
    amount: bigint;
    deadline: bigint;
    /** Milestone lifecycle status; `0` (MILESTONE_STATUS_PENDING) = open. */
    state: number;
  }>;
};

function isCommitteeMember(committee: readonly Address[], wallet: Address): boolean {
  return committee.some((c) => c.toLowerCase() === wallet.toLowerCase());
}

async function pollBuilderReputation(
  builders: Set<string>,
  addNotification: ReturnType<typeof useNotificationStore.getState>['addNotification'],
) {
  const { createPublicClient, http } = await import('viem');
  // The app (factory, escrows, identity registry) is deployed on Arbitrum
  // Sepolia — reading mainnet here returned no identity, so reputation alerts
  // never fired.
  const { arbitrumSepolia } = await import('viem/chains');
  const rpc = process.env.NEXT_PUBLIC_RPC_URL;
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpc || undefined),
  });

  for (const builderLc of builders) {
    try {
      const result = await client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: identityRegistryAbi,
        functionName: 'getIdentity',
        args: [builderLc as Address],
      });
      const score = Number(result.tier) * 25 + 15;
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

  // Stage 1 — resolve each grant's escrow address from the factory. Grants are
  // deployed one-escrow-per-grant, so we can't read a single shared escrow; the
  // on-chain `grantId` doubles as the factory index.
  const escrowResolveContracts = useMemo(
    () =>
      allGrantIds.map((grantId) => ({
        address: GRANT_FACTORY_ADDRESS,
        abi: factoryGrantsAbi,
        functionName: 'grants' as const,
        args: [grantId] as const,
      })),
    [allGrantIds],
  );

  const escrowResolveRead = useReadContracts({
    contracts: escrowResolveContracts,
    query: {
      enabled: Boolean(address) && allGrantIds.length > 0,
      refetchInterval: address ? 60_000 : false,
    },
  });

  // Escrow address per grant, index-aligned with `allGrantIds`.
  const grantEscrowAddresses = useMemo(
    () =>
      allGrantIds.map((_, gi) => {
        const row = escrowResolveRead.data?.[gi];
        const addr =
          row?.status === 'success' ? (row.result as Address | undefined) : undefined;
        return addr && addr !== ZERO_ADDRESS ? addr : undefined;
      }),
    [allGrantIds, escrowResolveRead.data],
  );

  // Stage 2 — read `getGrant()` (no args) on each resolved escrow. The returned
  // tuple already carries every milestone's `state` and `deadline`, so we no
  // longer need separate `getMilestoneStatus` calls. One read per grant,
  // index-aligned with `allGrantIds`.
  const grantContracts = useMemo(
    () =>
      grantEscrowAddresses.map((escrow) => ({
        address: (escrow ?? ZERO_ADDRESS) as Address,
        abi: grantEscrowReadAbi,
        functionName: 'getGrant' as const,
      })),
    [grantEscrowAddresses],
  );

  const grantsRead = useReadContracts({
    contracts: grantContracts,
    query: {
      enabled:
        Boolean(address) &&
        grantContracts.length > 0 &&
        grantEscrowAddresses.some(Boolean),
      refetchInterval: address ? 60_000 : false,
    },
  });

  // ── Warning / slash watcher plumbing ──────────────────────────────────────
  // `WarningIssued` is emitted by the shared SentinelEAS keyed by the escrow's
  // `bytes32` grantId, and `MilestoneSlashed` by each per-grant escrow. To wire
  // both back to the `uint256` grant ids the notifications use, we (1) resolve
  // the sentinel address from any escrow, and (2) read each escrow's `bytes32`
  // grantId so we can map a warning event to its grant.
  const publicClient = usePublicClient();

  const firstEscrow = useMemo(
    () => grantEscrowAddresses.find((a): a is Address => Boolean(a)),
    [grantEscrowAddresses],
  );

  const sentinelRead = useReadContract({
    address: firstEscrow,
    abi: escrowMetaAbi,
    functionName: 'sentinel',
    query: { enabled: Boolean(firstEscrow) },
  });
  const sentinelAddress = sentinelRead.data as Address | undefined;

  const grantBytes32Contracts = useMemo(
    () =>
      grantEscrowAddresses.map((escrow) => ({
        address: (escrow ?? ZERO_ADDRESS) as Address,
        abi: escrowMetaAbi,
        functionName: 'grantId' as const,
      })),
    [grantEscrowAddresses],
  );

  const grantBytes32Read = useReadContracts({
    contracts: grantBytes32Contracts,
    query: {
      enabled:
        Boolean(address) &&
        grantBytes32Contracts.length > 0 &&
        grantEscrowAddresses.some(Boolean),
    },
  });

  // bytes32 grantId (lowercased) → index into `allGrantIds`.
  const bytes32ToGrantIndex = useMemo(() => {
    const map = new Map<string, number>();
    (grantBytes32Read.data ?? []).forEach((row, gi) => {
      if (row.status === 'success' && row.result) {
        map.set(String(row.result).toLowerCase(), gi);
      }
    });
    return map;
  }, [grantBytes32Read.data]);

  // Keep the latest grant data / role available to imperative event handlers
  // without forcing watcher re-subscription on every 60s refetch.
  const grantsDataRef = useRef(grantsRead.data);
  grantsDataRef.current = grantsRead.data;
  const isDaoAdminRef = useRef(roles.isDaoAdmin);
  isDaoAdminRef.current = roles.isDaoAdmin;

  const pollDeadlines = useCallback(() => {
    if (!address || !walletLc || !grantsRead.data) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const fortyEightHours = 48 * 3600;

    for (let gi = 0; gi < allGrantIds.length; gi++) {
      const grantId = allGrantIds[gi]!;
      const grantRow = grantsRead.data[gi];
      if (!grantRow || grantRow.status !== 'success' || !grantRow.result) continue;

      const grant = grantRow.result as GrantTuple;
      const onCommittee = isCommitteeMember(grant.committee, address);
      const isBuilder = grant.builder.toLowerCase() === walletLc;

      for (let mi = 0; mi < grant.milestones.length; mi++) {
        const milestone = grant.milestones[mi]!;
        // Milestone lifecycle status now comes straight from the `getGrant`
        // tuple's per-milestone `state` field — only "Pending" (open) ones
        // are eligible for deadline / overdue alerts.
        const status = Number(milestone.state ?? MILESTONE_STATUS_PENDING);

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
        const grantRow = grantsRead.data[gi];
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

  const onLog = useCallback(
    (factory: () => Omit<AppNotification, 'id' | 'read'>) => {
      addNotification(factory());
    },
    [addNotification],
  );

  // GrantCreated — emitted by the GrantFactory (a single contract), not per
  // escrow. The builder is the `grantee`; the `grantor` is the DAO creator.
  useWatchContractEvent({
    address: GRANT_FACTORY_ADDRESS,
    abi: factoryGrantCreatedEventsAbi,
    eventName: 'GrantCreated',
    enabled: Boolean(walletLc),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId, grantor, grantee, totalAmount } = log.args as {
          grantId: bigint;
          escrow: Address;
          grantor: Address;
          grantee: Address;
          totalAmount: bigint;
        };
        if (grantee.toLowerCase() === walletLc) {
          onLog(() => builderGrantCreatedNotification(grantId, totalAmount));
        }
        if (grantor.toLowerCase() === walletLc || isDaoAdminRef.current) {
          onLog(() => daoGrantCreatedNotification(grantId, totalAmount));
        }
      }
    },
  });

  // WarningIssued — emitted by the shared SentinelEAS, keyed by the escrow's
  // `bytes32` grantId and addressed to the warned builder (`recipient`). We
  // watch the single sentinel contract and map the event back to a `uint256`
  // grant id (and milestone title) for the builder-facing notification.
  useWatchContractEvent({
    address: sentinelAddress,
    abi: sentinelWarningEventsAbi,
    eventName: 'WarningIssued',
    enabled: Boolean(walletLc) && Boolean(sentinelAddress),
    onLogs(logs) {
      for (const log of logs) {
        const { grantId: grantIdBytes, milestoneIndex, recipient } = log.args as {
          grantId: `0x${string}`;
          milestoneIndex: bigint;
          recipient: Address;
          attestationUid: `0x${string}`;
          message: string;
        };
        // Warnings are builder-facing — only surface the one addressed to us.
        if (recipient.toLowerCase() !== walletLc) continue;

        const gi = bytes32ToGrantIndex.get(grantIdBytes.toLowerCase());
        if (gi === undefined) continue;
        const grantId = allGrantIds[gi]!;
        const grantRow = grantsDataRef.current?.[gi];
        const grant =
          grantRow?.status === 'success' && grantRow.result
            ? (grantRow.result as GrantTuple)
            : undefined;
        const title =
          grant?.milestones?.[Number(milestoneIndex)]?.title ??
          `Milestone ${Number(milestoneIndex) + 1}`;

        onLog(() => builderWarningIssuedNotification(grantId, milestoneIndex, title));
      }
    },
  });

  // Per-escrow lifecycle events (MilestoneSubmitted / VoteCast / Approved /
  // Rejected / Slashed). The escrow IS the grant, so a single
  // `useWatchContractEvent` can't span N escrow addresses — we attach one
  // imperative watcher per escrow (watching all five events at once) and map
  // each back to its `uint256` grant id by escrow index. Mutable grant data and
  // role are read via refs so the 60s `getGrant` refetch doesn't tear down and
  // rebuild every subscription. These mirror the backend push path and share
  // its dedupe keys, so the two sources never double-add.
  useEffect(() => {
    if (!publicClient || !walletLc) return;
    const unwatchers = grantEscrowAddresses
      .map((escrow, gi) => {
        if (!escrow) return null;
        const grantId = allGrantIds[gi]!;
        return publicClient.watchContractEvent({
          address: escrow,
          abi: escrowLifecycleEventsAbi,
          onLogs: (logs) => {
            for (const log of logs) {
              const grantRow = grantsDataRef.current?.[gi];
              const grant =
                grantRow?.status === 'success' && grantRow.result
                  ? (grantRow.result as GrantTuple)
                  : undefined;
              const onCommittee = grant
                ? isCommitteeMember(grant.committee, walletLc as Address)
                : false;
              const isBuilder = grant?.builder?.toLowerCase() === walletLc;
              const titleFor = (mi: number) =>
                grant?.milestones?.[mi]?.title ?? `Milestone ${mi + 1}`;

              switch (log.eventName) {
                case 'MilestoneSubmitted': {
                  const { milestoneId, builder } = log.args as {
                    milestoneId: bigint;
                    builder: Address;
                  };
                  // Committee-facing; don't notify the submitter about itself.
                  if (!onCommittee || builder.toLowerCase() === walletLc) break;
                  addNotification(
                    committeeMilestoneSubmittedNotification(
                      grantId,
                      milestoneId,
                      titleFor(Number(milestoneId)),
                      builder,
                    ),
                  );
                  break;
                }
                case 'VoteCast': {
                  const { milestoneId, voter, approved, approvalCount } =
                    log.args as {
                      milestoneId: bigint;
                      voter: Address;
                      approved: boolean;
                      approvalCount: bigint;
                      rejectionCount: bigint;
                    };
                  // Committee-facing; skip our own vote.
                  if (!onCommittee || voter.toLowerCase() === walletLc) break;
                  addNotification(
                    committeeVoteCastNotification(
                      grantId,
                      milestoneId,
                      titleFor(Number(milestoneId)),
                      voter,
                      approved,
                      approvalCount,
                      grant?.quorum ?? 0n,
                    ),
                  );
                  break;
                }
                case 'MilestoneApproved': {
                  const { milestoneId, amount } = log.args as {
                    milestoneId: bigint;
                    amount: bigint;
                    streaming: boolean;
                  };
                  if (!isBuilder) break;
                  addNotification(
                    builderMilestoneApprovedNotification(
                      grantId,
                      milestoneId,
                      titleFor(Number(milestoneId)),
                      amount,
                    ),
                  );
                  break;
                }
                case 'MilestoneRejected': {
                  const { milestoneId } = log.args as {
                    milestoneId: bigint;
                    rejectionCount: bigint;
                  };
                  if (!isBuilder) break;
                  addNotification(
                    builderMilestoneRejectedNotification(
                      grantId,
                      milestoneId,
                      titleFor(Number(milestoneId)),
                    ),
                  );
                  break;
                }
                case 'MilestoneSlashed': {
                  const { milestoneId, amount } = log.args as {
                    milestoneId: bigint;
                    grantor: Address;
                    amount: bigint;
                    slashedAt: bigint;
                  };
                  const title = titleFor(Number(milestoneId));
                  const builder = grant?.builder ?? (address as Address);
                  if (isBuilder) {
                    addNotification(
                      builderMilestoneSlashedNotification(
                        grantId,
                        milestoneId,
                        title,
                        amount,
                        builder,
                      ),
                    );
                  }
                  if (isDaoAdminRef.current) {
                    addNotification(daoSlashExecutedNotification(grantId, amount));
                  }
                  break;
                }
                default:
                  break;
              }
            }
          },
        });
      })
      .filter((u): u is () => void => Boolean(u));

    return () => {
      for (const unwatch of unwatchers) unwatch();
    };
  }, [publicClient, walletLc, grantEscrowAddresses, allGrantIds, addNotification, address]);
}
