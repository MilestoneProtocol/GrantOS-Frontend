import { getPublicApiV1Base } from '@/lib/api-config';

const API_BASE_URL = getPublicApiV1Base();

export interface MilestoneWarning {
  id: number;
  grantId: number;
  milestoneIndex: number;
  builderAddress: string;
  committeeAddress: string;
  message: string;
  attestationUid: string;
  txHash: string;
  warningTimestamp: string;
  slashUnlocksAt: string;
  slashed: boolean;
  slashedAt: string | null;
  slashTxHash: string | null;
  amountReturnedUsdc: string | null;
  createdAt: string;
}

export interface IssueWarningRequest {
  grantId: number;
  milestoneIndex: number;
  builderAddress: string;
  committeeAddress: string;
  message: string;
  attestationUid: string;
  txHash: string;
  warningTimestamp: string;
}

export interface RecordSlashRequest {
  grantId: number;
  milestoneIndex: number;
  slashTxHash: string;
  slashedAt: string;
  amountReturnedUsdc: string;
}

export async function issueWarning(data: IssueWarningRequest): Promise<MilestoneWarning> {
  const res = await fetch(`${API_BASE_URL}/warnings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to issue warning: ${res.statusText}`);
  return res.json();
}

export async function recordSlash(data: RecordSlashRequest): Promise<MilestoneWarning> {
  const res = await fetch(`${API_BASE_URL}/warnings/slash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to record slash: ${res.statusText}`);
  return res.json();
}

export async function getWarningByMilestone(
  grantId: number,
  milestoneIndex: number,
): Promise<MilestoneWarning | null> {
  const res = await fetch(`${API_BASE_URL}/warnings/milestone/${grantId}/${milestoneIndex}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch warning: ${res.statusText}`);
  return res.json();
}

export async function getWarningsByBuilder(
  address: string,
  activeOnly = false,
): Promise<MilestoneWarning[]> {
  const params = new URLSearchParams({ address });
  if (activeOnly) params.set('active', 'true');
  const res = await fetch(`${API_BASE_URL}/warnings/builder?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch builder warnings: ${res.statusText}`);
  return res.json();
}

export async function getSlashCount(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/warnings/slash-count`);
  if (!res.ok) throw new Error(`Failed to fetch slash count: ${res.statusText}`);
  const data = await res.json();
  return data.count;
}
