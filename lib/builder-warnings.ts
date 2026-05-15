'use client';

import { getCommitteeDemoActions, isUiDemoMode } from '@/demo';
import { useEffect, useMemo, useState } from 'react';

/**
 * Cross-route store for builder-facing warning notifications (US-04 step 2:
 * the builder's dashboard banner). The committee surface mutates this store
 * when it issues / slashes a warning, and the builder dashboard subscribes
 * to it so a brand-new warning shows up the next time the builder lands on
 * their dashboard without needing a backend.
 *
 * Production swap: replace `getSeedBuilderWarnings()` with an indexer query
 * (or `useReadContract('getActiveWarnings', [builderAddress])`) and the
 * localStorage layer becomes redundant. The shape of `BuilderWarningRecord`
 * matches the `MilestoneWarning` EAS schema 1-to-1, so the migration is a
 * direct field map.
 */

/**
 * Post-slash payload attached to a warning record once the committee has
 * executed the slash. Presence of this field is the canonical signal that
 * the warning is terminal — banners filter it out, but the Warning Detail
 * page reads it to render the timeline's final state.
 */
export type BuilderWarningSlashInfo = {
  slashedAtIso: string;
  txHash: string;
  slashTxUrl: string;
  amountReturnedUsdc: number;
};

export type BuilderWarningRecord = {
  /** Stable id — we reuse the milestoneId so updates dedupe naturally. */
  id: string;
  /** OverdueMilestone id (and seed key). */
  milestoneId: string;
  builderAddress: `0x${string}`;
  grantId: string;
  grantTitle: string;
  milestoneTitle: string;
  milestoneIndex: number;
  /** Total amount at risk — drives the "FUNDS SLASHED" / "AT RISK" pill on the detail page. */
  amountAtRiskUsdc: number;
  committeeMemberAddress: `0x${string}`;
  /** Optional label rendered next to the committee address (e.g. "Committee Lead"). */
  committeeMemberLabel?: string;
  message: string;
  warningIssuedAtIso: string;
  slashUnlocksAtIso: string;
  attestationUrl: string;
  /**
   * When the milestone was originally approved (and the Superfluid stream
   * started). Drives the first entry of the milestone history timeline on
   * the detail page.
   */
  milestoneApprovedAtIso?: string;
  /**
   * When the deadline was passed (overdue trigger). Drives the second entry
   * of the milestone history timeline. If absent we fall back to
   * `warningIssuedAt - 7d` for a reasonable default.
   */
  milestoneOverdueAtIso?: string;
  /** Present iff the slash has been executed. */
  slash?: BuilderWarningSlashInfo;
};

const ACTIVE_STORAGE_KEY = 'grantos:builder-warnings:active:v1';
const CLEARED_STORAGE_KEY = 'grantos:builder-warnings:cleared:v1';
const CHANGE_EVENT = 'grantos:builder-warnings-changed';

/* --------------------------- Storage primitives --------------------------- */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readActive(): BuilderWarningRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BuilderWarningRecord[]) : [];
  } catch {
    return [];
  }
}

function writeActive(records: BuilderWarningRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Swallow quota / privacy-mode errors — the banner is non-critical UX.
  }
}

function readCleared(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CLEARED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeCleared(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CLEARED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Same rationale as `writeActive`.
  }
}

function notifyChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* ----------------------------- Mutation API ----------------------------- */

/**
 * Persist a warning so it surfaces on the builder's dashboard. Called from
 * the committee page once the warning attestation has confirmed onchain.
 * Removes the milestone from the cleared list if it was previously slashed
 * and re-warned (vanishingly unlikely in production, but cheap to support).
 */
export function saveBuilderWarning(record: BuilderWarningRecord): void {
  if (!isBrowser()) return;
  const cleared = readCleared().filter((id) => id !== record.milestoneId);
  writeCleared(cleared);

  const active = readActive().filter((w) => w.milestoneId !== record.milestoneId);
  writeActive([record, ...active]);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[builder-warnings] saved', {
      milestoneId: record.milestoneId,
      builderAddress: record.builderAddress,
      slashUnlocksAtIso: record.slashUnlocksAtIso,
    });
  }

  notifyChange();
}

/**
 * Mark a warning as resolved without a slash (rare path — only fired when
 * the committee re-reviews and dismisses an active warning). The record is
 * removed from the active store and the milestone id is remembered so the
 * seed warning for the same milestone, if any, is suppressed as well.
 *
 * For slashes use `markBuilderWarningSlashed` — that preserves the record
 * so the Warning Detail page can still surface the full timeline.
 */
export function clearBuilderWarning(milestoneId: string): void {
  if (!isBrowser()) return;
  const active = readActive().filter((w) => w.milestoneId !== milestoneId);
  writeActive(active);

  const cleared = readCleared();
  if (!cleared.includes(milestoneId)) {
    writeCleared([...cleared, milestoneId]);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[builder-warnings] cleared', { milestoneId });
  }

  notifyChange();
}

/**
 * Attach a `slash` payload to an existing warning record (committee just
 * executed the slash onchain). The record stays in the active store so the
 * Warning Detail page can keep rendering it indefinitely — the banner stack
 * filters `record.slash` out so the urgent red banner retires.
 *
 * Works against both stored (user-issued) records and the demo seed; if no
 * stored record exists yet we hydrate one from the seed before stamping
 * the slash so the lookup hooks always find something.
 */
export function markBuilderWarningSlashed(
  milestoneId: string,
  slash: BuilderWarningSlashInfo,
): void {
  if (!isBrowser()) return;

  const active = readActive();
  const existingIdx = active.findIndex((w) => w.milestoneId === milestoneId);

  if (existingIdx >= 0) {
    const next = active.slice();
    next[existingIdx] = { ...next[existingIdx], slash };
    writeActive(next);
  } else {
    // Cover the "slash a seeded warning" path: snapshot the seed record
    // into storage so the slash sticks across reloads.
    const seedRecord = getSeedBuilderWarnings().find(
      (w) => w.milestoneId === milestoneId,
    );
    if (seedRecord) {
      writeActive([{ ...seedRecord, slash }, ...active]);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[builder-warnings] slashed', {
      milestoneId,
      slashedAtIso: slash.slashedAtIso,
      amountReturnedUsdc: slash.amountReturnedUsdc,
    });
  }

  notifyChange();
}

/* ------------------------------- Seed data ------------------------------- */

/**
 * Materialise the demo's seeded `warning_issued` milestones into the
 * builder-facing record shape. Recomputed once per call — cheap.
 */
function getSeedBuilderWarnings(): BuilderWarningRecord[] {
  const view = getCommitteeDemoActions();
  return view.overdue
    .filter(
      (m): m is typeof m & { state: Extract<typeof m.state, { kind: 'warning_issued' }> } =>
        m.state.kind === 'warning_issued',
    )
    .map((m) => {
      const warningIssuedAtMs = new Date(m.state.warningIssuedAtIso).getTime();
      // Derive a plausible "milestone overdue" timestamp from `daysOverdue` —
      // the seed fixture exposes that count and the warning is typically
      // issued at the end of the grace period.
      const overdueAtMs = warningIssuedAtMs - m.daysOverdue * 24 * 60 * 60 * 1000;
      // Anchor the original approval ~90d before the warning so the timeline
      // has a sensible "Pending → Overdue → Warning → Slash" cadence.
      const approvedAtMs = overdueAtMs - 90 * 24 * 60 * 60 * 1000;
      return {
        id: m.id,
        milestoneId: m.id,
        builderAddress: m.builderAddress,
        grantId: m.grantId,
        grantTitle: m.grantTitle,
        milestoneTitle: m.milestoneTitle,
        milestoneIndex: m.milestoneIndex,
        amountAtRiskUsdc: m.amount.value,
        committeeMemberAddress: m.state.committeeMemberAddress,
        committeeMemberLabel: 'Committee Lead',
        message: m.state.message,
        warningIssuedAtIso: m.state.warningIssuedAtIso,
        slashUnlocksAtIso: m.state.slashUnlocksAtIso,
        attestationUrl: m.state.attestationUrl,
        milestoneApprovedAtIso: new Date(approvedAtMs).toISOString(),
        milestoneOverdueAtIso: new Date(overdueAtMs).toISOString(),
      };
    });
}

/* --------------------------------- Hook --------------------------------- */

/**
 * Internal: returns every record (active + slashed) for the connected
 * builder, merged from seed and storage. Used by both the banner stack
 * (which filters out slashed records) and the Warning Detail page (which
 * needs them).
 */
function useMergedBuilderWarnings(
  builderAddress?: `0x${string}`,
): BuilderWarningRecord[] {
  const seed = useMemo(() => getSeedBuilderWarnings(), []);
  const [active, setActive] = useState<BuilderWarningRecord[]>(() => readActive());
  const [cleared, setCleared] = useState<string[]>(() => readCleared());

  useEffect(() => {
    const refresh = () => {
      setActive(readActive());
      setCleared(readCleared());
    };
    refresh();

    window.addEventListener(CHANGE_EVENT, refresh);
    // `storage` only fires cross-tab, but it's a useful free signal.
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const merged = useMemo(() => {
    const activeById = new Map(active.map((w) => [w.milestoneId, w]));
    const clearedSet = new Set(cleared);
    const out: BuilderWarningRecord[] = [];

    for (const w of seed) {
      // Cleared records are dropped unless the stored copy has a `slash`
      // payload — we never want to hide a slashed history entry, even if
      // someone called `clearBuilderWarning` on the same milestone earlier.
      const stored = activeById.get(w.milestoneId);
      if (clearedSet.has(w.milestoneId) && !stored?.slash) continue;
      if (stored) {
        out.push(stored);
        activeById.delete(w.milestoneId);
      } else {
        out.push(w);
      }
    }
    for (const w of activeById.values()) {
      if (clearedSet.has(w.milestoneId) && !w.slash) continue;
      out.push(w);
    }

    return out;
  }, [seed, active, cleared]);

  return useMemo(() => {
    if (isUiDemoMode()) return merged;
    if (!builderAddress) return [];
    const lc = builderAddress.toLowerCase();
    return merged.filter((w) => w.builderAddress.toLowerCase() === lc);
  }, [merged, builderAddress]);
}

/**
 * Subscribe the calling component to *active* warnings only — the records
 * that still need a banner. Slashed records are filtered out (they live on
 * via the Warning Detail page, but the dashboard banner has retired).
 *
 * Merge rules:
 *  - Stored records (committee-issued via `saveBuilderWarning`) shadow seed
 *    records that share a `milestoneId`.
 *  - Anything in the cleared list is dropped, unless the stored copy has a
 *    `slash` payload (those records survive for the detail page).
 *  - When a `builderAddress` is provided we filter to grants owned by that
 *    wallet. In UI demo mode we deliberately bypass the filter so the
 *    banner is visible to any reviewer poking at the design, regardless of
 *    which wallet is connected.
 */
export function useBuilderWarnings(
  builderAddress?: `0x${string}`,
): BuilderWarningRecord[] {
  const merged = useMergedBuilderWarnings(builderAddress);
  return useMemo(() => merged.filter((w) => !w.slash), [merged]);
}

/**
 * Look up a single warning record by milestone id, including slashed ones.
 * Returns `null` until the storage refresh effect has settled, then either
 * the matching record or `null` if nothing matches.
 *
 * Powers the Warning Detail page (`/grants/[id]/milestones/[milestoneId]/warning`)
 * which must keep rendering after the slash transaction confirms.
 */
export function useBuilderWarning(milestoneId: string | undefined): BuilderWarningRecord | null {
  const merged = useMergedBuilderWarnings();
  return useMemo(() => {
    if (!milestoneId) return null;
    return merged.find((w) => w.milestoneId === milestoneId) ?? null;
  }, [merged, milestoneId]);
}

/**
 * Subscribe to every warning record targeting the connected builder —
 * active *and* slashed. Used by the `/builder/warnings` history list, which needs
 * to surface slashed records even after the dashboard banner has retired.
 *
 * Ordering: most recent activity first. We sort by either `slash.slashedAtIso`
 * (when slashed) or `warningIssuedAtIso` so the row the builder just
 * triggered always bubbles to the top.
 */
export function useAllBuilderWarnings(
  builderAddress?: `0x${string}`,
): BuilderWarningRecord[] {
  const merged = useMergedBuilderWarnings(builderAddress);
  return useMemo(() => {
    return merged.slice().sort((a, b) => {
      const at = new Date(a.slash?.slashedAtIso ?? a.warningIssuedAtIso).getTime();
      const bt = new Date(b.slash?.slashedAtIso ?? b.warningIssuedAtIso).getTime();
      return bt - at;
    });
  }, [merged]);
}

/** PRD-defined reputation deductions surfaced to the builder's header. */
export const REPUTATION_WARNING_PENALTY = 5;
export const REPUTATION_SLASH_PENALTY = 15;
/**
 * Demo starting reputation. Real builds derive this from
 * `GrantIdentityRegistry.getIdentity(builder).reputationScore`; the demo
 * uses a fixed 100 so the deductions are obvious to anyone driving the
 * flow without a wallet.
 */
const DEMO_BASE_REPUTATION = 100;

export type BuilderReputationSnapshot = {
  /** Score displayed in the header (base − penalties). */
  score: number;
  /** Original score before penalties were applied. */
  baseScore: number;
  /** Total deduction applied this render. */
  penalty: number;
  /** Number of active (non-slashed) warnings driving the penalty. */
  activeWarningCount: number;
  /** Number of slashed milestones driving the penalty. */
  slashedCount: number;
};

/**
 * Compute the builder's "live" reputation score from the warning store.
 *
 * Penalties applied per the PRD:
 *  - −{@link REPUTATION_WARNING_PENALTY} per active warning.
 *  - −{@link REPUTATION_SLASH_PENALTY} per slashed milestone.
 *
 * In production this would be a `useReadContract({ functionName:
 * 'getIdentity' }).reputationScore` call — the on-chain value already
 * reflects accrued penalties. For the click-through demo we synthesise
 * the same number client-side so the header flashes red the moment a
 * slash confirms on `/committee`.
 */
export function useBuilderReputationScore(
  builderAddress?: `0x${string}`,
): BuilderReputationSnapshot {
  const merged = useMergedBuilderWarnings(builderAddress);

  return useMemo(() => {
    const activeWarningCount = merged.filter((w) => !w.slash).length;
    const slashedCount = merged.filter((w) => w.slash).length;
    const penalty =
      REPUTATION_WARNING_PENALTY * activeWarningCount +
      REPUTATION_SLASH_PENALTY * slashedCount;
    const baseScore = DEMO_BASE_REPUTATION;
    const score = Math.max(0, baseScore - penalty);
    return { score, baseScore, penalty, activeWarningCount, slashedCount };
  }, [merged]);
}
