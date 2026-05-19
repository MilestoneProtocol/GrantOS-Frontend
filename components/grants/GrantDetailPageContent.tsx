'use client';

import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
import type { GrantDetailContext } from '@/lib/grant-routes';
import { buildUiDemoGrantTuple, isUiDemoMode, isUiDemoPathSegment, UI_DEMO_GRANT_DISPLAY_ID } from '@/demo';
import { easAttestationScanUrl } from '@/lib/eas-scan';
import {
  CONTRACTS_READY,
  GRANT_ESCROW_ADDRESS,
  grantEscrowReadAbi,
  IDENTITY_REGISTRY_ADDRESS,
  identityRegistryAbi,
  GRANT_FACTORY_ADDRESS,
  grantFactoryAbi,
} from '@/lib/escrow';
import {
  explorerDemoCardToGrantTuple,
  explorerSlugAsGrantId,
  findExplorerDemoGrant,
} from '@/lib/public-explorer-grant';
import { USDC_DECIMALS } from '@/lib/usdc';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  ExternalLink,
  Link2,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, keccak256, stringToHex, type Address, zeroAddress } from 'viem';
import { useReadContract, usePublicClient } from 'wagmi';
import { useGrantDetailFull } from '@/hooks/useGrantDetailFull';

type GrantTuple = {
  builder: Address;
  streaming: boolean;
  committee: Address[];
  quorum: bigint;
  createdAt: bigint;
  milestones: Array<{
    title: string;
    description: string;
    amount: bigint;
    deadline: bigint;
    proofType: number;
    state?: number;
  }>;
};

type TabKey = 'milestones' | 'transactions' | 'committee' | 'stream';

function parseGrantId(raw: string): bigint | null {
  const trimmed = decodeURIComponent(raw).trim();
  if (!trimmed) return null;
  try {
    if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return BigInt(trimmed);
    return null;
  } catch {
    return null;
  }
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsdc(v: bigint) {
  return Number(formatUnits(v, USDC_DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(ts: bigint) {
  if (ts <= BigInt(0)) return '—';
  return new Date(Number(ts) * 1000).toLocaleString();
}

function milestoneStatus(i: number) {
  if (i === 0) return 'completed' as const;
  if (i === 1) return 'in_review' as const;
  if (i === 2) return 'warning' as const;
  return 'pending' as const;
}

function hashHex(input: string) {
  return keccak256(stringToHex(input));
}

function fakeAiVerdict(milestoneTitle: string, status: string) {
  if (status === 'completed' || status === 'approved') {
    return {
      badge: 'Pass',
      explanation:
        `Evidence for "${milestoneTitle}" is internally consistent: referenced artifacts map to the expected scope, and timeline checks pass. Delivery confidence is high; no material gaps detected.`,
    };
  }
  if (status === 'warning') {
    return {
      badge: 'Review',
      explanation:
        `Evidence bundle for "${milestoneTitle}" is partially complete. Some dependencies are unresolved and one required verification artifact is missing. Committee review should request clarification before release.`,
    };
  }
  return {
    badge: 'Review',
    explanation:
      `Submission quality for "${milestoneTitle}" is still being evaluated. Preliminary checks indicate valid structure, but final release requires quorum confirmation and onchain finalization.`,
  };
}

function voteForMember(member: Address, milestoneIndex: number): 'approve' | 'reject' | 'abstain' {
  const h = hashHex(`${member}-${milestoneIndex}`);
  const n = Number(BigInt(h) % BigInt(100));
  if (n < 65) return 'approve';
  if (n < 85) return 'abstain';
  return 'reject';
}

export function GrantDetailPageContent({
  variant = 'public',
}: {
  variant?: GrantDetailContext;
}) {
  const params = useParams<{ id: string }>();
  const rawId = params?.id ?? '';
  const grantId = useMemo(() => parseGrantId(rawId), [rawId]);
  const demoCard = useMemo(() => findExplorerDemoGrant(rawId), [rawId]);
  const uiDemoPath = isUiDemoMode() && isUiDemoPathSegment(rawId);

  const [activeTab, setActiveTab] = useState<TabKey>('milestones');
  const [streamAccumulated, setStreamAccumulated] = useState(0);
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});
  const [loadingVotes, setLoadingVotes] = useState(false);

  const publicClient = usePublicClient();

  const { data: backendData, isLoading: isBackendLoading } = useGrantDetailFull(
    grantId !== null ? Number(grantId) : null
  );

  const { data: escrowAddress, isLoading: isEscrowLoading } = useReadContract({
    address: GRANT_FACTORY_ADDRESS,
    abi: grantFactoryAbi,
    functionName: 'grants',
    args: grantId !== null ? [grantId] : undefined,
    query: { enabled: grantId !== null && CONTRACTS_READY },
  });

  const { data, isLoading: isGrantLoading, isError } = useReadContract({
    address: escrowAddress as `0x${string}`,
    abi: grantEscrowReadAbi,
    functionName: 'getGrant',
    query: { enabled: Boolean(escrowAddress) && CONTRACTS_READY },
  });

  const isLoading = isEscrowLoading || isGrantLoading || isBackendLoading;

  const chainGrant = (data ?? null) as GrantTuple | null;
  const chainGrantExists = useMemo(() => {
    if (!chainGrant) return false;
    if (
      chainGrant.builder === zeroAddress &&
      chainGrant.createdAt === BigInt(0) &&
      chainGrant.milestones.length === 0
    ) {
      return false;
    }
    return true;
  }, [chainGrant]);

  const chainResolved = Boolean(!isEscrowLoading && !isGrantLoading && !isError && chainGrantExists && chainGrant);

  const resolvedGrant = useMemo((): (GrantTuple & { backendMilestones?: any[]; txHash?: string }) | null => {
    if (chainResolved && chainGrant) {
      return {
        ...chainGrant,
        txHash: backendData?.grant?.txHash,
        milestones: chainGrant.milestones.map((m, idx) => {
          const backendMilestone = backendData?.milestones?.find((bm) => bm.index === idx);
          return {
            ...m,
            title: m.title || backendMilestone?.title || `Milestone ${idx + 1}`,
            description: m.description || backendMilestone?.description || '',
          };
        }),
        backendMilestones: backendData?.milestones,
      };
    }

    if (backendData) {
      return {
        builder: backendData.grant.granteeAddress as Address,
        streaming: backendData.grant.isStreaming,
        committee: backendData.grant.committee.map((c) => c as Address),
        quorum: BigInt(backendData.grant.quorum),
        createdAt: BigInt(Math.floor(new Date(backendData.grant.createdAt).getTime() / 1000) || 0),
        txHash: backendData.grant.txHash,
        milestones: backendData.milestones.map((m) => ({
          title: m.title,
          description: m.description,
          amount: BigInt(m.amount),
          deadline: BigInt(parseInt(m.deadline || '0', 10)),
          proofType: m.proofType,
        })),
        backendMilestones: backendData.milestones,
      };
    }

    if (demoCard) return explorerDemoCardToGrantTuple(demoCard);
    if (uiDemoPath) return buildUiDemoGrantTuple(zeroAddress);
    return null;
  }, [chainGrant, chainResolved, backendData, demoCard, uiDemoPath]);

  useEffect(() => {
    if (!publicClient || !escrowAddress || !resolvedGrant?.committee.length || !resolvedGrant?.milestones.length) return;
    
    let active = true;
    const fetchVotes = async () => {
      setLoadingVotes(true);
      try {
        const newMap: Record<string, boolean> = {};
        await Promise.all(
          resolvedGrant.milestones.flatMap((_, mIdx) =>
            resolvedGrant.committee.map(async (member) => {
              const voted = await publicClient.readContract({
                address: escrowAddress as Address,
                abi: grantEscrowReadAbi,
                functionName: 'hasVoted',
                args: [BigInt(mIdx), member],
              });
              if (active) {
                newMap[`${mIdx}-${member.toLowerCase()}`] = Boolean(voted);
              }
            })
          )
        );
        if (active) {
          setVotedMap(newMap);
        }
      } catch (err) {
        console.error('Error fetching onchain votes:', err);
      } finally {
        if (active) setLoadingVotes(false);
      }
    };
    
    fetchVotes();
    return () => {
      active = false;
    };
  }, [publicClient, escrowAddress, resolvedGrant?.committee, resolvedGrant?.milestones.length]);

  const effectiveGrantId = useMemo(() => {
    if (chainResolved && grantId !== null) return grantId;
    if (demoCard) return explorerSlugAsGrantId(demoCard.slug);
    if (uiDemoPath) return UI_DEMO_GRANT_DISPLAY_ID;
    return grantId;
  }, [chainResolved, demoCard, grantId, uiDemoPath]);

  const grantBadgeLabel = useMemo(() => {
    if (demoCard) return demoCard.displayId.replace(/^#/, '');
    if (grantId !== null) return `GRT-${grantId.toString()}-X`;
    if (uiDemoPath) return 'ui-demo';
    return '—';
  }, [demoCard, grantId, uiDemoPath]);

  const { data: identity } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: identityRegistryAbi,
    functionName: 'getIdentity',
    args: resolvedGrant ? [resolvedGrant.builder] : undefined,
    query: { enabled: Boolean(resolvedGrant?.builder) },
  });

  const zkVerified =
    Boolean(identity?.isVerified) || (!chainResolved && Boolean(demoCard?.zkVerified));

  const committee = resolvedGrant?.committee ?? [];
  const milestones = resolvedGrant?.milestones ?? [];
  const totalUsdc = milestones.reduce((sum, m) => sum + m.amount, BigInt(0));

  const { flowRatePerSec, streamSeed } = useMemo(() => {
    if (demoCard && !chainResolved) {
      return {
        flowRatePerSec: demoCard.streamRateUsdcPerSec,
        streamSeed: demoCard.streamAccumulatedUsdcAtEpoch,
      };
    }
    
    if (resolvedGrant) {
      const totalAmountNum = Number(formatUnits(totalUsdc, USDC_DECIMALS));
      const thirtyDaysInSecs = 30 * 24 * 3600;
      const calculatedFlowRate = totalAmountNum / thirtyDaysInSecs;
      
      const startTs = Number(resolvedGrant.createdAt);
      const nowSecs = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSecs - startTs);
      
      const calculatedSeed = Math.min(totalAmountNum, elapsed * calculatedFlowRate);
      
      return {
        flowRatePerSec: calculatedFlowRate,
        streamSeed: calculatedSeed,
      };
    }
    
    return {
      flowRatePerSec: 0.05,
      streamSeed: 12459.472013,
    };
  }, [demoCard, chainResolved, resolvedGrant, totalUsdc]);

  const streamActive = Boolean(resolvedGrant?.streaming);

  useEffect(() => {
    if (!streamActive) return;
    setStreamAccumulated(streamSeed);
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const totalAmountNum = Number(formatUnits(totalUsdc, USDC_DECIMALS));
      setStreamAccumulated(Math.min(totalAmountNum, streamSeed + elapsed * flowRatePerSec));
    }, 100);
    return () => window.clearInterval(id);
  }, [flowRatePerSec, streamActive, streamSeed, totalUsdc]);

  const txRows = useMemo(() => {
    if (!resolvedGrant) return [];
    const rows: Array<{ type: string; ts: string; tx: string; actor: Address }> = [];
    rows.push({
      type: 'Grant Created',
      ts: formatDate(resolvedGrant.createdAt),
      tx: resolvedGrant.txHash || backendData?.grant?.txHash || backendData?.grant?.escrowAddress || hashHex(`grant-created-${rawId}`),
      actor: resolvedGrant.builder,
    });

    if (resolvedGrant.backendMilestones) {
      resolvedGrant.backendMilestones.forEach((bm: any, i: number) => {
        if (bm.submission) {
          rows.push({
            type: `Milestone #${i + 1} Submitted`,
            ts: bm.submission.createdAt ? new Date(bm.submission.createdAt).toLocaleString() : '—',
            tx: bm.submission.submissionTxHash || hashHex(`milestone-sub-${rawId}-${i}`),
            actor: resolvedGrant.builder,
          });

          if (bm.submission.status === 'approved') {
            rows.push({
              type: `Milestone #${i + 1} Approved`,
              ts: new Date(bm.submission.createdAt).toLocaleString(),
              tx: bm.submission.submissionTxHash || hashHex(`payment-${rawId}-${i}`),
              actor: resolvedGrant.committee[0] || resolvedGrant.builder,
            });
          } else if (bm.submission.status === 'rejected') {
            rows.push({
              type: `Milestone #${i + 1} Rejected`,
              ts: new Date(bm.submission.createdAt).toLocaleString(),
              tx: bm.submission.submissionTxHash || hashHex(`reject-${rawId}-${i}`),
              actor: resolvedGrant.committee[0] || resolvedGrant.builder,
            });
          }
        }

        if (bm.warnings && bm.warnings.length > 0) {
          bm.warnings.forEach((w: any) => {
            rows.push({
              type: `Warning Issued (Milestone #${i + 1})`,
              ts: w.warningTimestamp ? new Date(parseInt(w.warningTimestamp) * 1000).toLocaleString() : new Date(w.createdAt).toLocaleString(),
              tx: w.txHash,
              actor: w.committeeAddress as Address,
            });

            if (w.slashed) {
              rows.push({
                type: `Milestone #${i + 1} Slashed`,
                ts: w.slashedAt ? new Date(w.slashedAt).toLocaleString() : '—',
                tx: w.slashTxHash || w.txHash,
                actor: w.committeeAddress as Address,
              });
            }
          });
        }
      });
    } else {
      milestones.forEach((m, i) => {
        rows.push({
          type: 'Milestone Submitted',
          ts: new Date((Number(resolvedGrant.createdAt) + (i + 1) * 3600 * 24 * 3) * 1000).toLocaleString(),
          tx: hashHex(`milestone-sub-${rawId}-${i}`),
          actor: resolvedGrant.builder,
        });
        const status = milestoneStatus(i);
        if (status === 'warning') {
          rows.push({
            type: 'Warning Issued',
            ts: new Date((Number(resolvedGrant.createdAt) + (i + 1) * 3600 * 24 * 4) * 1000).toLocaleString(),
            tx: hashHex(`warning-${rawId}-${i}`),
            actor: committee[0] ?? resolvedGrant.builder,
          });
        } else if (status === 'completed') {
          rows.push({
            type: 'Payment Released',
            ts: new Date((Number(resolvedGrant.createdAt) + (i + 1) * 3600 * 24 * 5) * 1000).toLocaleString(),
            tx: hashHex(`payment-${rawId}-${i}`),
            actor: committee[0] ?? resolvedGrant.builder,
          });
        }
      });
    }

    if (resolvedGrant.streaming) {
      rows.push({
        type: 'Stream Started',
        ts: new Date((Number(resolvedGrant.createdAt) + 7200) * 1000).toLocaleString(),
        tx: hashHex(`stream-${rawId}`),
        actor: committee[0] ?? resolvedGrant.builder,
      });
    }
    return rows.sort((a, b) => (new Date(a.ts).getTime() > new Date(b.ts).getTime() ? -1 : 1));
  }, [committee, milestones, rawId, resolvedGrant, backendData]);

  const routeInvalid =
    !rawId.trim() ||
    (grantId === null && !demoCard && !uiDemoPath);

  const showSkeleton =
    CONTRACTS_READY &&
    isLoading &&
    grantId !== null &&
    !demoCard &&
    !chainResolved &&
    !resolvedGrant;

  const awaitingChain =
    CONTRACTS_READY && grantId !== null && isLoading && !demoCard && !uiDemoPath;

  const showNotFound =
    Boolean(rawId.trim()) &&
    !resolvedGrant &&
    !demoCard &&
    !uiDemoPath &&
    !awaitingChain;

  const showInvalidRoute = !rawId.trim();

  const notFoundLinks =
    variant === 'builder'
      ? [
          { href: '/my-grants', label: 'My grants' },
          { href: '/builder', label: 'Dashboard' },
        ]
      : variant === 'treasury'
        ? [{ href: '/treasury', label: 'Treasury' }]
        : variant === 'dao'
          ? [{ href: '/dao', label: 'DAO dashboard' }]
        : variant === 'committee'
          ? [{ href: '/committee/grants', label: 'All grants' }]
          : [
              { href: '/grants', label: 'Public explorer' },
              { href: '/', label: 'Home' },
            ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      {variant === 'public' ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          Public explorer · read-only
        </p>
      ) : null}
      {showInvalidRoute ? (
        <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grant not found</h1>
          <p className="mt-2 text-sm text-slate-500">Missing grant id in the URL.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {notFoundLinks.map(({ href, label }, i) => (
              <Link
                key={href}
                href={href}
                className={
                  i === 0
                    ? 'rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black'
                    : 'rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50'
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : showNotFound || routeInvalid ? (
        <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grant not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This id is not on GrantEscrow and does not match the public explorer demo catalogue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {notFoundLinks.map(({ href, label }, i) => (
              <Link
                key={href}
                href={href}
                className={
                  i === 0
                    ? 'rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black'
                    : 'rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50'
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : showSkeleton ? (
        <section className="animate-pulse space-y-4">
          <div className="h-10 rounded-xl bg-slate-100" />
          <div className="h-44 rounded-2xl bg-slate-100" />
          <div className="h-96 rounded-2xl bg-slate-100" />
        </section>
      ) : resolvedGrant && effectiveGrantId !== null ? (
        <div className="space-y-6">
          {demoCard && !chainResolved ? (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <span className="font-semibold">Demo grant.</span> This entry comes from the same catalogue as{' '}
              <Link href="/grants" className="font-semibold underline">
                /grants
              </Link>
              . On-chain <code className="rounded bg-sky-100/80 px-1">getGrant</code> is unavailable or empty for this id — wire your deployment to see live escrow data.
            </p>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-slate-900 px-3 py-1.5 font-mono text-lg font-bold text-white">
                    {grantBadgeLabel}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Active
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {milestones[0]?.title || 'Zero-Knowledge Proof Aggregation Layer'}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Link
                    href={`/builders/${resolvedGrant.builder}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-slate-700 hover:bg-slate-100"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    {shortenAddress(resolvedGrant.builder)}
                  </Link>
                  <ZKVerifiedBadge verified={zkVerified} />
                  <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(resolvedGrant.createdAt)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-4xl font-bold tracking-tight text-slate-900">
                  {formatUsdc(totalUsdc)} <span className="text-lg font-medium text-slate-500">USDC</span>
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Grant Amount</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-slate-500">Committee</p>
                    <p className="font-semibold text-slate-900">{committee.length} Members</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-slate-500">Quorum</p>
                    <p className="font-semibold text-slate-900">
                      {Number(resolvedGrant.quorum)} / {committee.length} Votes
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-slate-500">Payment Mode</p>
                    <p className="font-semibold text-slate-900">
                      {resolvedGrant.streaming ? 'Superfluid Stream' : 'Milestone Escrow'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {streamActive ? (
              <div className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 animate-grantos-pulse rounded-full bg-emerald-400" />
                    Live Streaming
                  </div>
                  <p className="font-mono text-xl font-semibold text-emerald-400">
                    {streamAccumulated.toFixed(6)} USDC
                  </p>
                  <p className="font-mono text-sm text-slate-300">
                    {flowRatePerSec < 0.01 ? flowRatePerSec.toFixed(8) : flowRatePerSec.toFixed(6)} USDC / sec
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
            <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <TabButton tab="milestones" active={activeTab} setActive={setActiveTab}>Milestones</TabButton>
              <TabButton tab="transactions" active={activeTab} setActive={setActiveTab}>Transactions</TabButton>
              <TabButton tab="committee" active={activeTab} setActive={setActiveTab}>Committee</TabButton>
              {streamActive ? (
                <TabButton tab="stream" active={activeTab} setActive={setActiveTab}>Stream</TabButton>
              ) : null}
            </nav>

            {activeTab === 'milestones' ? (
              <MilestonesTab grantId={effectiveGrantId} grant={resolvedGrant} escrowAddress={escrowAddress as Address} votedMap={votedMap} />
            ) : null}
            {activeTab === 'transactions' ? (
              <TransactionsTab txRows={txRows} />
            ) : null}
            {activeTab === 'committee' ? (
              <CommitteeTab grant={resolvedGrant} votedMap={votedMap} />
            ) : null}
            {activeTab === 'stream' && streamActive ? (
              <StreamTab
                grant={resolvedGrant}
                flowRatePerSec={flowRatePerSec}
                accumulated={streamAccumulated}
              />
            ) : null}
          </section>
        </div>
      ) : (
        <section className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Loading…
        </section>
      )}
    </main>
  );
}

function TabButton({
  tab,
  active,
  setActive,
  children,
}: {
  tab: TabKey;
  active: TabKey;
  setActive: (t: TabKey) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => setActive(tab)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        active === tab
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function MilestonesTab({
  grantId,
  grant,
  escrowAddress,
  votedMap = {},
}: {
  grantId: bigint;
  grant: GrantTuple & { backendMilestones?: any[] };
  escrowAddress?: Address;
  votedMap?: Record<string, boolean>;
}) {
  return (
    <div className="space-y-5">
      {grant.milestones.map((m, i) => {
        const backendMilestone = grant.backendMilestones?.[i];
        
        let displayStatus: 'completed' | 'in_review' | 'warning' | 'rejected' | 'pending' | 'slashed' | 'streaming' = 'pending';
        let label = 'Pending';

        const milestoneStateOnChain = m.state !== undefined ? m.state : null;
        if (milestoneStateOnChain !== null) {
          if (milestoneStateOnChain === 0) {
            displayStatus = 'pending';
            label = 'Pending';
          } else if (milestoneStateOnChain === 1) {
            displayStatus = 'in_review';
            label = 'In Review';
          } else if (milestoneStateOnChain === 2) {
            displayStatus = 'completed';
            label = 'Completed';
          } else if (milestoneStateOnChain === 3) {
            displayStatus = 'rejected';
            label = 'Rejected';
          } else if (milestoneStateOnChain === 4) {
            displayStatus = 'slashed';
            label = 'Slashed';
          } else if (milestoneStateOnChain === 5) {
            displayStatus = 'streaming';
            label = 'Live Streaming';
          }
        } else if (backendMilestone?.submission) {
          const s = backendMilestone.submission.status;
          if (s === 'approved') {
            displayStatus = 'completed';
            label = 'Completed';
          } else if (s === 'submitted') {
            displayStatus = 'in_review';
            label = 'In Review';
          } else if (s === 'rejected') {
            displayStatus = 'rejected';
            label = 'Rejected';
          }
        } else {
          const s = milestoneStatus(i);
          displayStatus = s;
          label =
            s === 'completed'
              ? 'Completed'
              : s === 'in_review'
                ? 'In Review'
                : s === 'warning'
                  ? 'Warning Issued'
                  : 'Pending';
        }

        const hasWarning = backendMilestone?.warnings && backendMilestone.warnings.length > 0;
        if (hasWarning && displayStatus === 'in_review') {
          displayStatus = 'warning';
          label = 'Warning Issued';
        }

        let approvals = 0;
        let votes: Array<{ member: Address; vote: 'approve' | 'reject' | 'abstain' | 'pending' }> = [];

        if (Object.keys(votedMap).length > 0) {
          const committeeAddresses = grant.committee.map(c => c.toLowerCase());
          const votedMembers = committeeAddresses.filter(addr => votedMap[`${i}-${addr}`]);
          const approvalCount = Number(backendMilestone?.submission?.approvalCount || 0);
          
          votes = grant.committee.map((member) => {
            const memberLower = member.toLowerCase();
            const hasVotedOnChain = votedMap[`${i}-${memberLower}`];
            if (!hasVotedOnChain) {
              return { member, vote: 'pending' };
            }
            const memberIndexInVoted = votedMembers.indexOf(memberLower);
            if (memberIndexInVoted >= 0 && memberIndexInVoted < approvalCount) {
              return { member, vote: 'approve' };
            }
            return { member, vote: 'reject' };
          });
          approvals = votes.filter(v => v.vote === 'approve').length;
        } else {
          votes = grant.committee.map((member) => ({
            member,
            vote: voteForMember(member, i),
          }));
          approvals = votes.filter((v) => v.vote === 'approve').length;
        }

        const ai = fakeAiVerdict(m.title || `Milestone ${i + 1}`, displayStatus);
        const warningRows = backendMilestone?.warnings
          ? backendMilestone.warnings.map((w: any) => ({
              at: w.warningTimestamp ? new Date(parseInt(w.warningTimestamp) * 1000).toLocaleString() : new Date(w.createdAt).toLocaleString(),
              member: w.committeeAddress as Address,
              message: w.message,
              uid: w.attestationUid,
            }))
          : (displayStatus === 'warning'
            ? [
                {
                  at: new Date((Number(grant.createdAt) + (i + 1) * 3600 * 24 * 4) * 1000).toLocaleString(),
                  member: grant.committee[0] ?? grant.builder,
                  message:
                    'Evidence package is incomplete. Please submit missing references within cool-off window.',
                  uid: hashHex(`warning-uid-${grantId.toString()}-${i}`),
                },
              ]
            : []);

        const proofHash = backendMilestone?.submission?.proofHash || hashHex(`proof-${grantId.toString()}-${i}`);
        const proofUrl = backendMilestone?.submission?.prUrl || `https://sepolia.arbiscan.io/tx/${proofHash}`;
        
        return (
          <article key={`${grantId.toString()}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">#{i + 1}</span>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    {m.title || `Milestone ${i + 1}`}
                  </h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    displayStatus === 'completed' || displayStatus === 'streaming'
                      ? 'bg-emerald-50 text-emerald-700'
                      : displayStatus === 'warning'
                        ? 'bg-amber-50 text-amber-700'
                        : displayStatus === 'in_review'
                          ? 'bg-sky-50 text-sky-700'
                          : displayStatus === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                  }`}>
                    {label}
                  </span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    {m.proofType === 0 ? 'ZK Proof' : m.proofType === 1 ? 'PR Proof' : 'Manual Proof'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{m.description || 'No description provided.'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{formatUsdc(m.amount)} USDC</p>
                <p className="text-xs text-slate-500">
                  Deadline: {m.deadline > BigInt(0) ? new Date(Number(m.deadline) * 1000).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">ZK Proof</h4>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  <p>PR Number: {backendMilestone?.submission?.prUrl ? backendMilestone.submission.prUrl.match(/pull\/(\d+)/)?.[1] || `#${(i + 1) * 17}` : `#${(i + 1) * 17}`}</p>
                  <p>Merge Status: {displayStatus === 'completed' || displayStatus === 'streaming' ? 'Merged' : 'Open'}</p>
                  <p>Author: @builder_{shortenAddress(grant.builder).replace('…', '_')}</p>
                  <p className="inline-flex items-center gap-1">
                    Verification:
                    {backendMilestone?.submission
                      ? (backendMilestone.submission.zkVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" /> Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700"><X className="h-3.5 w-3.5" /> Unverified</span>
                      ))
                      : (displayStatus === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" /> Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700"><X className="h-3.5 w-3.5" /> Unverified</span>
                      ))
                    }
                  </p>
                  <p>Block: {backendMilestone?.submission?.submissionTxHash ? '33565576' : Number(BigInt(hashHex(`block-${proofHash}`)) % BigInt(5000000)) + 29000000}</p>
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-sky-700 hover:underline"
                  >
                    {proofHash.slice(0, 10)}…{proofHash.slice(-6)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">AI Verdict</h4>
                <div className="mt-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    (backendMilestone?.submission?.aiVerdict || ai.badge) === 'Pass' || (backendMilestone?.submission?.aiVerdict || ai.badge) === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {backendMilestone?.submission?.aiVerdict || ai.badge}
                  </span>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{backendMilestone?.submission?.aiExplanation || ai.explanation}</p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Committee Votes</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {votes.map((v) => (
                    <span
                      key={`${i}-${v.member}`}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        v.vote === 'approve'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.vote === 'reject'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {shortenAddress(v.member)}
                      {v.vote === 'approve' ? <CircleCheck className="h-3.5 w-3.5" /> : null}
                      {v.vote === 'reject' ? <CircleX className="h-3.5 w-3.5" /> : null}
                      {v.vote === 'abstain' ? <Clock3 className="h-3.5 w-3.5" /> : null}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {approvals} of {Number(grant.quorum)} required
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Warning History</h4>
                {warningRows.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No warning attestations recorded.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {warningRows.map((w) => (
                      <li key={w.uid} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                        <p className="text-xs text-amber-900">{w.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-amber-800">
                          <span>{w.at}</span>
                          <span>{shortenAddress(w.member)}</span>
                          <a
                            href={easAttestationScanUrl(w.uid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline"
                          >
                            EAS link
                            <Link2 className="h-3 w-3" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TransactionsTab({
  txRows,
}: {
  txRows: Array<{ type: string; ts: string; tx: string; actor: Address }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Event</th>
            <th className="px-3 py-2">Timestamp</th>
            <th className="px-3 py-2">Tx</th>
            <th className="px-3 py-2">Triggered By</th>
          </tr>
        </thead>
        <tbody>
          {txRows.map((row) => (
            <tr key={`${row.type}-${row.tx}`} className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-900">{row.type}</td>
              <td className="px-3 py-2 text-slate-600">{row.ts}</td>
              <td className="px-3 py-2">
                <a
                  href={row.tx.startsWith('0x') && row.tx.length === 66 ? `https://sepolia.arbiscan.io/tx/${row.tx}` : `https://sepolia.arbiscan.io/address/${row.tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-sky-700 hover:underline"
                >
                  {row.tx.slice(0, 10)}…{row.tx.slice(-6)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-700">{shortenAddress(row.actor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommitteeTab({
  grant,
  votedMap = {},
}: {
  grant: GrantTuple & { backendMilestones?: any[] };
  votedMap?: Record<string, boolean>;
}) {
  return (
    <div className="space-y-4">
      {grant.committee.map((member) => (
        <article key={member} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-mono text-sm font-semibold text-slate-900">{member}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[420px] text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-2 py-1 text-left">Milestone</th>
                  {grant.milestones.map((_, idx) => (
                    <th key={idx} className="px-2 py-1 text-center">#{idx + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 font-medium text-slate-700">Vote</td>
                  {grant.milestones.map((_, idx) => {
                    const memberKey = `${idx}-${member.toLowerCase()}`;
                    const hasVotedOnChain = votedMap[memberKey];
                    const backendMilestone = grant.backendMilestones?.[idx];
                    
                    let voteStatus = 'pending';
                    if (Object.keys(votedMap).length > 0) {
                      if (hasVotedOnChain) {
                        const approvalCount = Number(backendMilestone?.submission?.approvalCount || 0);
                        const committeeAddresses = grant.committee.map(c => c.toLowerCase());
                        const votedMembers = committeeAddresses.filter(addr => votedMap[`${idx}-${addr}`]);
                        const memberIndexInVoted = votedMembers.indexOf(member.toLowerCase());
                        
                        if (memberIndexInVoted >= 0 && memberIndexInVoted < approvalCount) {
                          voteStatus = 'approved';
                        } else {
                          voteStatus = 'rejected';
                        }
                      } else {
                        voteStatus = 'pending';
                      }
                    } else {
                      const v = voteForMember(member, idx);
                      voteStatus = v === 'approve' ? 'approved' : v === 'reject' ? 'rejected' : 'pending';
                    }

                    return (
                      <td key={idx} className="px-2 py-1 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          voteStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : voteStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {voteStatus === 'approved' ? 'approve' : voteStatus === 'rejected' ? 'reject' : 'pending'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  );
}

function StreamTab({
  grant,
  flowRatePerSec,
  accumulated,
}: {
  grant: GrantTuple;
  flowRatePerSec: number;
  accumulated: number;
}) {
  const startTs = Number(grant.createdAt) + 7200;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Stream Status</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">Active</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Flow Rate</p>
        <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
          {flowRatePerSec < 0.01 ? flowRatePerSec.toFixed(8) : flowRatePerSec.toFixed(2)} USDC/sec
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Total Streamed</p>
        <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{accumulated.toFixed(6)} USDC</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Start Timestamp</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(startTs * 1000).toLocaleString()}</p>
        <p className="mt-2 text-xs text-slate-500">
          Cancellation Timestamp: —
        </p>
        <p className="text-xs text-slate-500">Cancellation Reason: —</p>
      </div>
      <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        Live ticker updates every 100ms while stream status is active.
      </div>
    </div>
  );
}

