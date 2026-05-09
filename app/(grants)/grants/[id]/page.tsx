'use client';

import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import ConnectButton from '@/components/ConnectButton';
import {
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
} from '@/lib/escrow';
import { USDC_DECIMALS } from '@/lib/usdc';
import {
  buildUiDemoGrantSummary,
  isUiDemoMode,
  isUiDemoPathSegment,
  UI_DEMO_GRANT_DISPLAY_ID,
} from '@/demo';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Copy,
  Gavel,
  Check,
  Lock,
  ThumbsUp,
  PenLine,
  ExternalLink,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, type Address } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

function parseGrantIdFromPath(raw: string): bigint | undefined {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed) return undefined;

  let s = trimmed;
  const grit = /^GRT-\d{4}-(.+)$/i.exec(s);
  if (grit) s = grit[1]!;

  if (/^\d+$/.test(s)) {
    try {
      return BigInt(s);
    } catch {
      return undefined;
    }
  }

  const hex = s.startsWith('0x') || s.startsWith('0X') ? s : `0x${s}`;
  try {
    if (/^0x[0-9a-f]*$/i.test(hex) && hex.length > 2) return BigInt(hex);
  } catch {
    /* fallthrough */
  }
  return undefined;
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function escrowAddressDisplay(addr: Address) {
  const a = `${addr}`;
  return `${a.slice(0, 7)}…${a.slice(-4)}`;
}

function formatUsdcLabel(amountWei: bigint) {
  const n = Number(formatUnits(amountWei, USDC_DECIMALS));
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function milestoneVisualState(
  index: number,
  total: number
): 'done' | 'active' | 'locked' {
  if (total <= 0) return 'locked';
  if (total === 1) return index === 0 ? 'active' : 'locked';
  if (index === 0) return 'done';
  if (index === 1) return 'active';
  return 'locked';
}

export default function GrantDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = params?.id ?? '';
  const numericGrantId = useMemo(() => parseGrantIdFromPath(routeId), [routeId]);
  const isDemoPath = isUiDemoPathSegment(routeId);
  const isDemoRoute = isUiDemoMode() && isDemoPath;
  const { chain, isConnected, address } = useAccount();

  const demoGrant = useMemo(
    () => (isDemoRoute && address ? buildUiDemoGrantSummary(address) : null),
    [address, isDemoRoute]
  );

  const routeValid =
    Boolean(routeId.trim()) &&
    (numericGrantId !== undefined || isDemoRoute);

  const chainReadEnabled = numericGrantId !== undefined && !isDemoPath;
  const [dismissedInvalidRouteId, setDismissedInvalidRouteId] = useState('');
  const [dismissedGrantLoadErrorKey, setDismissedGrantLoadErrorKey] = useState('');

  const {
    data: grantData,
    isLoading: grantLoadingChain,
    isError: grantErrorChain,
  } = useReadContract({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowReadAbi,
    functionName: 'getGrant',
    args: chainReadEnabled && numericGrantId !== undefined ? [numericGrantId] : undefined,
    query: { enabled: chainReadEnabled },
  });

  const resolvedGrant = isDemoRoute ? demoGrant : grantData;
  const grantLoading = isDemoRoute ? false : grantLoadingChain;
  const grantError = isDemoRoute ? false : grantErrorChain;

  const builderAddress = resolvedGrant?.builder as Address | undefined;

  const { data: identityData } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: builderAddress ? [builderAddress] : undefined,
    query: { enabled: Boolean(builderAddress) },
  });

  const zkVerified = Boolean(identityData?.[0]);

  const milestones = useMemo(() => resolvedGrant?.milestones ?? [], [resolvedGrant]);

  const totalAllocationWei = useMemo(
    () => milestones.reduce((sum, m) => sum + m.amount, BigInt(0)),
    [milestones]
  );

  const disbursedWei = useMemo(() => {
    if (milestones.length === 0) return BigInt(0);
    let sum = BigInt(0);
    for (let i = 0; i < milestones.length; i++) {
      if (milestoneVisualState(i, milestones.length) === 'done') sum += milestones[i]!.amount;
    }
    return sum;
  }, [milestones]);

  const disbursedPercent =
    totalAllocationWei > BigInt(0)
      ? Math.min(
          100,
          Number((disbursedWei * BigInt(100)) / totalAllocationWei)
        )
      : 0;

  const createdAtTs = resolvedGrant?.createdAt;
  const createdDate =
    typeof createdAtTs === 'bigint' && createdAtTs > BigInt(0)
      ? new Date(Number(createdAtTs) * 1000)
      : null;

  const grantLabel = useMemo(() => {
    if (isDemoRoute) return 'Demo';
    if (numericGrantId === undefined) return routeId ? routeId.slice(0, 16) : '—';
    if (numericGrantId <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return numericGrantId.toString();
    }
    return `#${numericGrantId.toString(16).slice(0, 8)}`.toUpperCase();
  }, [isDemoRoute, numericGrantId, routeId]);

  const milestoneRowKeyPrefix = isDemoRoute ? UI_DEMO_GRANT_DISPLAY_ID.toString() : numericGrantId?.toString() ?? routeId;

  const grantHeading = useMemo(() => {
    if (isDemoRoute && !address) return 'Demo grant (connect wallet)';
    if (grantLoading) return 'Loading grant…';
    if (grantError) return `Grant · ${grantLabel}`;
    const titled = milestones.find((m) => m.title.trim())?.title;
    return titled || 'Grant program';
  }, [address, grantError, grantLabel, grantLoading, isDemoRoute, milestones]);

  const paymentModeLabel = resolvedGrant?.streaming ? 'Streaming' : 'Milestone-based';

  const committee = resolvedGrant?.committee ?? [];
  const invalidRouteKey = routeValid ? '' : routeId.trim() || '__empty__';
  const showInvalidIdError = Boolean(invalidRouteKey) && dismissedInvalidRouteId !== invalidRouteKey;
  const grantLoadErrorKey =
    !grantLoading && chainReadEnabled && grantErrorChain ? `${routeId}-grant-load-error` : '';
  const showGrantLoadError =
    Boolean(grantLoadErrorKey) && dismissedGrantLoadErrorKey !== grantLoadErrorKey;

  useEffect(() => {
    if (!showInvalidIdError) return;
    const timeoutId = window.setTimeout(() => setDismissedInvalidRouteId(invalidRouteKey), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [invalidRouteKey, showInvalidIdError]);

  useEffect(() => {
    if (!showGrantLoadError) return;
    const timeoutId = window.setTimeout(
      () => setDismissedGrantLoadErrorKey(grantLoadErrorKey),
      2000
    );
    return () => window.clearTimeout(timeoutId);
  }, [grantLoadErrorKey, showGrantLoadError]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <header className="border-b border-slate-200/90 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-[#ff6a00]">
            <ArrowLeft className="h-5 w-5 shrink-0 stroke-[2.25]" />
            <span className="truncate text-base font-semibold md:text-[1.05rem]">GrantOS v3</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-[375px]:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-hidden
                />
                {chain?.name ?? 'Arbitrum One'}
              </div>
            <ConnectButton variant="avatar" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:pb-12">
        {isDemoRoute && address ? (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">UI demo grant.</span> This page uses mock data from{' '}
            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">demo/ui-demo.ts</code> — not{' '}
            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">getGrant</code>. Disable with{' '}
            <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GRANTOS_UI_DEMO=false</code>.
          </p>
        ) : null}

        {showInvalidIdError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Invalid grant id in URL. Expected a numeric id, hex id, <code>GRT-2026-…</code> slug, or{' '}
            <code className="text-[11px]">ui-demo</code> when{' '}
            <code className="text-[11px]">NEXT_PUBLIC_GRANTOS_UI_DEMO=true</code>.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-8">
          <div className="min-w-0 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-teal-500">
                  Active
                </span>
                <span className="text-sm font-normal text-slate-500">
                  Grant #{grantLoading ? '…' : grantError ? routeId.slice(0, 12) : grantLabel}
                </span>
              </div>

              <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.85rem] md:text-[2rem] lg:text-[2.1rem]">
                {grantHeading}
              </h1>

              <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
                {grantLoading ? (
                  'Fetching creation date…'
                ) : showGrantLoadError ? (
                  'Could not load grant from chain.'
                ) : createdDate ? (
                  <>
                    Created on{' '}
                    {createdDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    ·{' '}
                    {createdDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                      timeZoneName: 'short',
                    })}
                  </>
                ) : (
                  'Creation time not indexed'
                )}
              </p>

              {showGrantLoadError ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  Confirm <code className="text-[11px]">NEXT_PUBLIC_GRANT_ESCROW_ADDRESS</code> matches
                  your deployment and that <code className="text-[11px]">getGrant(uint256)</code> matches{' '}
                  <code className="text-[11px]">lib/escrow.ts grantEscrowReadAbi</code>.
                </p>
              ) : null}
            </div>

            <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-6">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Builder details
              </h2>
              <div className="mt-3 rounded-lg border border-slate-100 bg-[#fafbfc] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6a00] text-white shadow-sm">
                      <UserRound className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tracking-tight text-slate-900">
                          {builderAddress ? shortenAddress(builderAddress) : '—'}
                        </span>
                        {builderAddress ? (
                          <button
                            type="button"
                            onClick={() => copyText(builderAddress)}
                            className="inline-flex shrink-0 items-center text-slate-400 transition hover:text-slate-600"
                            aria-label="Copy wallet address"
                          >
                            <Copy className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">Primary Recipient</p>
                    </div>
                  </div>
                  <ZKVerifiedBadge verified={zkVerified} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Milestone progress ({milestones.length} total)
                </h2>
                <p className="text-[11px] font-medium text-slate-500 sm:text-right">
                  Escrowed:{' '}
                  <span className="font-semibold text-slate-700">
                    {grantLoading ? '…' : formatUsdcLabel(totalAllocationWei)} USDC
                  </span>
                </p>
              </div>

              <div className="relative space-y-0 pl-[18px] sm:pl-[22px]">
                <span
                  className="absolute left-[17px] top-2 bottom-2 w-[2px] -translate-x-1/2 bg-slate-200 sm:left-[21px]"
                  aria-hidden
                />

                {grantLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="relative animate-pulse rounded-lg border border-slate-100 bg-slate-50 p-4 pl-10"
                    >
                      <div className="absolute left-[3px] top-4 h-3 w-3 rounded-full bg-slate-300" />
                      <div className="mb-2 h-4 max-w-[60%] rounded bg-slate-200" />
                      <div className="mb-3 h-3 max-w-[90%] rounded bg-slate-100" />
                      <div className="h-8 max-w-[40%] rounded bg-slate-200" />
                    </div>
                  ))
                ) : milestones.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    {isDemoRoute && !address
                      ? 'Connect your wallet to preview mock milestones for this demo grant.'
                      : 'No milestones for this grant.'}
                  </p>
                ) : (
                  milestones.map((m, i) => {
                    const visual = milestoneVisualState(i, milestones.length);
                    return (
                      <div key={`${milestoneRowKeyPrefix}-${i}-${m.title}`} className="relative pb-5 last:pb-0">
                        <div className="absolute left-0 top-4 z-1 -translate-x-1/2 sm:top-4.5">
                          {visual === 'done' ? (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500 text-white shadow-sm">
                                <Check className="h-4 w-4 stroke-3" />
                            </span>
                          ) : visual === 'active' ? (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-orange-400 shadow-sm">
                              <span className="h-2 w-2 rounded-full bg-white" />
                            </span>
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#dfe3e9] bg-slate-50 text-[12px] font-bold text-slate-400 shadow-sm">
                              {i + 1}
                            </span>
                          )}
                        </div>

                        <div
                          className={`ml-[22px] rounded-lg border p-4 pt-4 sm:ml-[30px] ${
                            visual === 'active'
                              ? 'border-[#ffb480] bg-white shadow-[0_0_0_1px_rgba(255,106,0,0.08)]'
                              : visual === 'done'
                                ? 'border-[#eaecef] bg-white'
                                : 'border-transparent bg-[#fafbfc] opacity-95'
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <h3
                                className={`text-[15px] font-bold leading-snug ${visual === 'locked' ? 'text-slate-500' : 'text-slate-900'}`}
                              >
                                M{i + 1}: {m.title || 'Untitled milestone'}
                              </h3>
                              <p
                                className={`mt-1.5 text-sm leading-relaxed ${visual === 'locked' ? 'text-slate-400' : 'text-slate-500'}`}
                              >
                                {m.description || '—'}
                              </p>
                            </div>
                            <p
                              className={`text-right text-[15px] font-bold whitespace-nowrap sm:pl-4 ${visual === 'locked' ? 'text-slate-400' : 'text-slate-900'}`}
                            >
                              {formatUsdcLabel(m.amount)} USDC
                            </p>
                          </div>

                          {visual === 'done' ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Completed{' '}
                                {m.deadline > BigInt(0)
                                  ? new Date(Number(m.deadline) * 1000).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : '—'}
                              </span>
                            </div>
                          ) : null}

                          {visual === 'active' ? (
                            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-xs font-semibold text-teal-600">● In Progress</span>
                              {isDemoRoute ? (
                                <Link
                                  href={`/grants/ui-demo/milestones/${i}/submit`}
                                  className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                                >
                                  Open milestone submission
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="relative inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400"
                                >
                                  Submit Proof
                                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                    Coming soon
                                  </span>
                                </button>
                              )}
                            </div>
                          ) : null}

                          {visual === 'locked' ? (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-400">
                              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                              Locked
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Total allocation
              </p>
              <p className="mt-3 text-[2.25rem] font-bold tracking-tight text-slate-900 sm:text-[2.5rem]">
                {grantLoading ? '…' : formatUsdcLabel(totalAllocationWei)}
                <span className="ml-2 text-lg font-semibold normal-case text-slate-500"> USDC</span>
              </p>
              <div className="mt-5 space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#ff6a00] transition-[width]"
                    style={{ width: `${disbursedPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{formatUsdcLabel(disbursedWei)} Disbursed</span>
                  <span>{disbursedPercent}%</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/90 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Configuration
              </h3>
              <dl className="mt-4 space-y-4 border-t border-slate-50 pt-2">
                <div className="flex items-baseline justify-between gap-3 pt-3 first:pt-0">
                  <dt className="text-xs text-slate-500">Payment Mode</dt>
                  <dd className="text-right text-sm font-semibold text-slate-900">
                    {grantLoading ? '…' : paymentModeLabel}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-slate-100">
                  <dt className="text-xs text-slate-500">Committee Size</dt>
                  <dd className="text-right text-sm font-semibold text-slate-900">
                    {grantLoading ? '…' : `${committee.length} Members`}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-slate-100">
                  <dt className="text-xs text-slate-500">Approval Threshold</dt>
                  <dd className="text-right text-sm font-semibold text-slate-900">
                    {grantLoading
                      ? '…'
                      : resolvedGrant && committee.length > 0
                        ? `${Number(resolvedGrant.quorum)} of ${committee.length} Signatures`
                        : `${Number(resolvedGrant?.quorum ?? BigInt(0))} Signatures`}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="text-xs text-slate-500">Contract</dt>
                  <dd>
                    <a
                      href={`https://arbiscan.io/address/${GRANT_ESCROW_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 underline-offset-4 hover:text-teal-700 hover:underline"
                    >
                      {escrowAddressDisplay(GRANT_ESCROW_ADDRESS)}
                      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    </a>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200/90 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Committee Actions
              </h3>
              <ul className="mt-1 divide-y divide-slate-100">
                <li>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-semibold text-slate-800"
                  >
                    <ThumbsUp className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.75} />
                    <span className="flex-1">Approve Payment</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Coming soon</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-semibold text-slate-800"
                  >
                    <Gavel className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.75} />
                    <span className="flex-1">Slash Grant</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Coming soon</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-semibold text-slate-800"
                  >
                    <PenLine className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.75} />
                    <span className="flex-1">Edit Metadata</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Coming soon</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>

      <footer className="mx-auto mt-10 max-w-6xl px-4 pb-10 pt-6 text-[11px] text-slate-400 md:px-6 lg:mt-14 lg:flex lg:items-center lg:justify-between lg:border-t lg:border-slate-200/70 lg:px-8 lg:pt-8">
        <span>© 2026 GrantOS. Secured by Arbitrum.</span>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 lg:mt-0">
          <a href="#" className="hover:text-slate-600">
            Documentation
          </a>
          <a href="#" className="hover:text-slate-600">
            Explorer
          </a>
          <a href="#" className="hover:text-slate-600">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
