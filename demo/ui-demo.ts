/**
 * UI-only mock grant for local development. Enable with
 * `NEXT_PUBLIC_GRANTOS_UI_DEMO=true` in `.env.local` (restart dev server).
 * All demo-specific constants and builders live under `/demo`.
 */
import { USDC_DECIMALS } from '@/lib/usdc';
import type { Address } from 'viem';

/** URL segment for demo grant: `/grants/ui-demo/milestones/0/submit` */
export const UI_DEMO_GRANT_PATH_ID = 'ui-demo';

/** Stable id for React keys / “Grant #” in dashboard when using demo data. */
export const UI_DEMO_GRANT_DISPLAY_ID = BigInt(9_000_001);

/** Human-readable grant name shown in milestone submission header (UI demo only). */
export const UI_DEMO_GRANT_TITLE = 'Decentralized Identity Protocol Integration';

/** UI demo is disabled while the app uses live backend / chain data. */
export function isUiDemoMode(): boolean {
  return false;
}

export function isUiDemoPathSegment(raw: string): boolean {
  return decodeURIComponent(raw).trim() === UI_DEMO_GRANT_PATH_ID;
}

export type UiDemoGrantSummary = {
  id: bigint;
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
  }>;
};

const usdc = (whole: number) => BigInt(whole) * BigInt(10) ** BigInt(USDC_DECIMALS);

/** Fixed deadline for mock milestones (Oct 31, 2025 UTC). */
const DEMO_DEADLINE_SEC = BigInt(Date.UTC(2025, 9, 31) / 1000);

export function buildUiDemoGrantSummary(builder: Address): UiDemoGrantSummary {
  return {
    id: UI_DEMO_GRANT_DISPLAY_ID,
    builder,
    streaming: false,
    committee: [],
    quorum: BigInt(1),
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    milestones: [
      {
        title: 'Phase 2: Core Protocol Smart Contracts',
        description:
          'Ship the core escrow and milestone state machine contracts, with tests and NatSpec. This milestone covers audit-ready Solidity, deployment scripts, and integration with the existing GrantOS registry.',
        amount: usdc(5_000),
        deadline: DEMO_DEADLINE_SEC,
        proofType: 0,
      },
      {
        title: 'Phase 3: Integration & documentation',
        description:
          'Wire the frontend to new contract events, document committee flows, and publish builder-facing guides for milestone submission.',
        amount: usdc(2_000),
        deadline: DEMO_DEADLINE_SEC + BigInt(86400) * BigInt(30),
        proofType: 0,
      },
    ],
  };
}

export type UiDemoGrantTuple = Omit<UiDemoGrantSummary, 'id'>;

export function buildUiDemoGrantTuple(builder: Address): UiDemoGrantTuple {
  const full = buildUiDemoGrantSummary(builder);
  return {
    builder: full.builder,
    streaming: full.streaming,
    committee: full.committee,
    quorum: full.quorum,
    createdAt: full.createdAt,
    milestones: full.milestones,
  };
}
