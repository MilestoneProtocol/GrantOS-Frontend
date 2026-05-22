import { EAS_SCHEMA_UID } from '@/lib/eas-config';
import { easAttestationScanUrl } from '@/lib/eas-scan';
import { getAddress, isAddress, type Address } from 'viem';

/** Arbitrum Sepolia EAS indexer (same host pattern as https://arbitrum-sepolia.easscan.org ). */
export const EAS_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_EAS_GRAPHQL_URL?.trim() || 'https://arbitrum-sepolia.easscan.org/graphql';

const DELTAS = {
  MilestoneApprovedOnTime: 10,
  MilestoneApprovedLate: 4,
  ZKProofSubmitted: 2,
  MilestoneRejected: -3,
  WarningIssued: -5,
  MilestoneSlashed: -15,
} as const;

export type ReputationEventKind = keyof typeof DELTAS;

export type ReputationScoreEvent = {
  id: `0x${string}`;
  kind: ReputationEventKind;
  /** Point change for this row. */
  delta: number;
  /** Running total after this event, clamped 0–100 (bank-statement style). */
  runningTotal: number;
  grantId: string;
  milestoneTitle: string;
  milestoneIndex: number;
  timestampMs: number;
  easScanUrl: string;
};

export type MilestoneCellOutcome =
  | 'pending'
  | 'approved_on_time'
  | 'approved_late'
  | 'rejected'
  | 'warning'
  | 'slashed';

export type MilestoneGridCell = {
  grantId: string;
  milestoneIndex: number;
  title: string;
  outcome: MilestoneCellOutcome;
  /** Latest relevant event time for tooltip */
  updatedAtMs: number;
};

export type ReputationResult = {
  address: Address;
  score: number;
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** 0–100 or null if no denominator. */
  deliveryRatePercent: number | null;
  /** ZK proof attestations / milestones that reached non-pending (heuristic). */
  zkSubmissionRatePercent: number | null;
  slashCount: number;
  events: ReputationScoreEvent[];
  /** Deduped grid cells (latest outcome wins). */
  milestoneCells: MilestoneGridCell[];
};

type RawAttestation = {
  id: string;
  schemaId: string;
  recipient: string;
  attester: string;
  timeCreated: number;
  decodedDataJson: string | null;
  revocationTime: number;
};

function letterGradeFromScore(score: number): ReputationResult['letterGrade'] {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 90) return 'A';
  if (s >= 75) return 'B';
  if (s >= 60) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

function parseDecodedRows(json: string | null): Array<{ name: string; value: unknown }> {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as Array<{
      name?: string;
      value?: { value?: unknown; type?: string };
    }>;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((row) => {
        const name = typeof row.name === 'string' ? row.name : '';
        const inner = row.value as { value?: unknown } | undefined;
        const v = inner?.value !== undefined ? inner.value : row.value;
        return { name, value: v };
      })
      .filter((r) => r.name);
  } catch {
    return [];
  }
}

function rowMap(rows: Array<{ name: string; value: unknown }>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const r of rows) m[r.name] = r.value;
  return m;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && v !== null && 'type' in v && (v as { type?: string }).type === 'BigNumber') {
    const hex = (v as { hex?: string }).hex;
    if (hex) return BigInt(hex).toString();
  }
  return '';
}

function asBigintish(v: unknown): bigint {
  const s = asString(v);
  if (!s) return BigInt(0);
  try {
    if (s.startsWith('0x')) return BigInt(s);
    return BigInt(s);
  } catch {
    return BigInt(0);
  }
}

function normalizeEventToken(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .toLowerCase();
}

function mapTokenToKind(token: string): ReputationEventKind | null {
  const n = normalizeEventToken(token);
  if (n.includes('milestoneapproved') && (n.includes('ontime') || n.includes('on-time') || n.endsWith('ontime')))
    return 'MilestoneApprovedOnTime';
  if (n.includes('milestoneapproved') && (n.includes('late') || n.endsWith('late'))) return 'MilestoneApprovedLate';
  if (n.includes('zkproof') || n === 'zkproofsubmitted') return 'ZKProofSubmitted';
  if (n.includes('milestonerejected') || n === 'rejected') return 'MilestoneRejected';
  if (n.includes('warningissued') || n === 'warning') return 'WarningIssued';
  if (n.includes('milestoneslashed') || n === 'slashed') return 'MilestoneSlashed';
  return null;
}

/**
 * Resolve GrantOS reputation event from decoded attestation payload.
 * Supports explicit `eventType` / `reputationEvent` / `event` string fields, or
 * milestone submission schema (`NEXT_PUBLIC_EAS_SCHEMA_UID`) with non-zero `zkProofHash`.
 */
function classifyAttestation(
  schemaId: string,
  decodedJson: string | null,
  recipientLc: string,
  attesterLc: string,
  builderLc: string,
): { kind: ReputationEventKind; grantId: string; milestoneIndex: number; milestoneTitle: string } | null {
  const rows = parseDecodedRows(decodedJson);
  const m = rowMap(rows);

  const eventRaw =
    asString(m.eventType) ||
    asString(m.reputationEvent) ||
    asString(m.event) ||
    asString(m.kind) ||
    asString(m.action);
  let kind = eventRaw ? mapTokenToKind(eventRaw) : null;

  let grantId = asString(m.grantId) || asString(m.grant_id) || '0';
  let milestoneIndex = Number(asBigintish(m.milestoneIndex ?? m.milestone_index ?? m.index));
  if (!Number.isFinite(milestoneIndex)) milestoneIndex = 0;
  const milestoneTitle =
    asString(m.milestoneTitle) || asString(m.milestone_title) || asString(m.title) || 'Milestone';

  if (!kind && EAS_SCHEMA_UID && schemaId.toLowerCase() === EAS_SCHEMA_UID.toLowerCase()) {
    const zkHex = asString(m.zkProofHash);
    const hasZk =
      zkHex &&
      zkHex !== '0x' + '0'.repeat(64) &&
      zkHex !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (hasZk && (attesterLc === builderLc || recipientLc === builderLc)) {
      kind = 'ZKProofSubmitted';
    }
  }

  if (!kind) return null;

  if (!grantId || grantId === '0') {
    grantId = asString(m.grant) || grantId;
  }

  return { kind, grantId, milestoneIndex, milestoneTitle };
}

const ATTESTATIONS_QUERY = `
query ReputationAttestations($addr: String!, $take: Int!, $skip: Int!) {
  attestations(
    take: $take
    skip: $skip
    orderBy: { timeCreated: asc }
    where: {
      revocationTime: { equals: 0 }
      OR: [{ recipient: { equals: $addr } }, { attester: { equals: $addr } }]
    }
  ) {
    id
    schemaId
    recipient
    attester
    timeCreated
    decodedDataJson
    revocationTime
  }
}
`;

async function fetchAllAttestations(addressLc: string): Promise<RawAttestation[]> {
  const page = 200;
  const maxPages = 50;
  const out: RawAttestation[] = [];

  for (let p = 0; p < maxPages; p++) {
    const skip = p * page;
    const res = await fetch(EAS_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ATTESTATIONS_QUERY,
        variables: {
          addr: addressLc,
          take: page,
          skip,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`EAS indexer HTTP ${res.status}`);
    }

    const body = (await res.json()) as {
      data?: { attestations?: RawAttestation[] };
      errors?: { message: string }[];
    };

    if (body.errors?.length) {
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }

    const chunk = body.data?.attestations ?? [];
    out.push(...chunk);

    if (chunk.length < page) break;
  }

  const byId = new Map<string, RawAttestation>();
  for (const x of out) {
    byId.set(x.id.toLowerCase(), x);
  }
  return Array.from(byId.values()).sort((x, y) => x.timeCreated - y.timeCreated);
}

function applyOutcome(
  prev: MilestoneCellOutcome,
  kind: ReputationEventKind,
): MilestoneCellOutcome {
  if (kind === 'MilestoneSlashed') return 'slashed';
  if (kind === 'MilestoneRejected') return 'rejected';
  if (kind === 'WarningIssued') {
    if (prev === 'slashed') return 'slashed';
    return 'warning';
  }
  if (kind === 'MilestoneApprovedOnTime') {
    if (prev === 'slashed' || prev === 'rejected') return prev;
    return 'approved_on_time';
  }
  if (kind === 'MilestoneApprovedLate') {
    if (prev === 'slashed' || prev === 'rejected') return prev;
    return 'approved_late';
  }
  return prev;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Pure async scoring from Arbitrum EAS indexer attestations linked to `address`
 * (single query: recipient OR attester, de-duplicated by attestation id).
 */
export async function calculateReputationScore(raw: string): Promise<ReputationResult> {
  const trimmed = raw.trim();
  if (!trimmed || !isAddress(trimmed)) {
    throw new Error('Invalid builder address');
  }

  const address = getAddress(trimmed);
  const addressLc = address.toLowerCase();

  const rawList = await fetchAllAttestations(addressLc);

  const events: ReputationScoreEvent[] = [];
  const cellKey = (gid: string, mid: number) => `${gid}:${mid}`;
  const cells = new Map<
    string,
    { outcome: MilestoneCellOutcome; title: string; updatedAtMs: number; grantId: string; milestoneIndex: number }
  >();

  let rawScore = 0;
  let zkCount = 0;
  let slashCount = 0;

  for (const att of rawList) {
    const recipientLc = (att.recipient || '').toLowerCase();
    const attesterLc = (att.attester || '').toLowerCase();
    const parsed = classifyAttestation(
      att.schemaId,
      att.decodedDataJson,
      recipientLc,
      attesterLc,
      addressLc,
    );
    if (!parsed) continue;

    const delta = DELTAS[parsed.kind];
    rawScore += delta;
    if (parsed.kind === 'ZKProofSubmitted') zkCount += 1;
    if (parsed.kind === 'MilestoneSlashed') slashCount += 1;

    const gid = parsed.grantId || '0';
    const ck = cellKey(gid, parsed.milestoneIndex);
    const prev = cells.get(ck)?.outcome ?? 'pending';
    const next = applyOutcome(prev, parsed.kind);
    cells.set(ck, {
      outcome: next,
      title: parsed.milestoneTitle,
      updatedAtMs: att.timeCreated * 1000,
      grantId: gid,
      milestoneIndex: parsed.milestoneIndex,
    });

    events.push({
      id: att.id as `0x${string}`,
      kind: parsed.kind,
      delta,
      runningTotal: clampScore(rawScore),
      grantId: gid,
      milestoneTitle: parsed.milestoneTitle,
      milestoneIndex: parsed.milestoneIndex,
      timestampMs: att.timeCreated * 1000,
      easScanUrl: easAttestationScanUrl(att.id),
    });
  }

  const score = clampScore(rawScore);

  const milestoneCells: MilestoneGridCell[] = Array.from(cells.values()).map((c) => ({
    grantId: c.grantId,
    milestoneIndex: c.milestoneIndex,
    title: c.title,
    outcome: c.outcome,
    updatedAtMs: c.updatedAtMs,
  }));

  let approved = 0;
  let nonPending = 0;
  for (const c of milestoneCells) {
    if (c.outcome === 'pending') continue;
    nonPending += 1;
    if (c.outcome === 'approved_on_time' || c.outcome === 'approved_late') approved += 1;
  }

  const deliveryRatePercent =
    nonPending > 0 ? Math.round((approved / nonPending) * 1000) / 10 : null;

  const zkDenom = nonPending > 0 ? nonPending : milestoneCells.length;
  const zkSubmissionRatePercent =
    zkDenom > 0 ? Math.round((zkCount / zkDenom) * 1000) / 10 : zkCount > 0 ? 100 : null;

  return {
    address,
    score,
    letterGrade: letterGradeFromScore(score),
    deliveryRatePercent,
    zkSubmissionRatePercent,
    slashCount,
    events,
    milestoneCells,
  };
}
