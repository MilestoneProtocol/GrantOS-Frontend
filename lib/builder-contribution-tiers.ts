/** Reputation-point bands for builder contribution tiers (private + public profile). */
export type ContributionTierId = 'newcomer' | 'active' | 'established' | 'veteran';

export type ContributionTierDef = {
  id: ContributionTierId;
  label: string;
  min: number;
  max: number | null;
};

export const CONTRIBUTION_TIERS: ContributionTierDef[] = [
  { id: 'newcomer', label: 'Newcomer', min: 0, max: 49 },
  { id: 'active', label: 'Active', min: 50, max: 299 },
  { id: 'established', label: 'Established', min: 300, max: 999 },
  { id: 'veteran', label: 'Veteran', min: 1000, max: null },
];

export function tierFromReputationPoints(points: number): ContributionTierDef {
  const p = Math.max(0, Math.floor(points));
  for (let i = CONTRIBUTION_TIERS.length - 1; i >= 0; i--) {
    const t = CONTRIBUTION_TIERS[i]!;
    if (p >= t.min) return t;
  }
  return CONTRIBUTION_TIERS[0]!;
}

export function tierRangeLabel(tier: ContributionTierDef): string {
  if (tier.max == null) return `${tier.min}+ pts`;
  return `${tier.min}–${tier.max} pts`;
}
