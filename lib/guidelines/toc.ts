import type { GuidelinesSectionId, GuidelinesTocItem } from './types';

export const GUIDELINES_TOC: GuidelinesTocItem[] = [
  {
    id: 'how-it-works',
    label: 'How GrantOS Works',
    shortLabel: 'How It Works',
  },
  {
    id: 'zk-proof',
    label: 'ZK Proof Verification Explained',
    shortLabel: 'ZK Proof',
  },
  {
    id: 'committee',
    label: 'Committee Member Responsibilities',
    shortLabel: 'Committee',
  },
  {
    id: 'builder-rights',
    label: 'Builder Rights and Due Process',
    shortLabel: 'Builder Rights',
  },
  {
    id: 'slashing',
    label: 'Slashing Rules',
    shortLabel: 'Slashing',
  },
  {
    id: 'reputation',
    label: 'Reputation Scoring System',
    shortLabel: 'Reputation',
  },
  {
    id: 'faq',
    label: 'FAQ',
    shortLabel: 'FAQ',
  },
  {
    id: 'contracts',
    label: 'Smart Contract Addresses',
    shortLabel: 'Contracts',
  },
];

export const DEFAULT_SECTION_ID: GuidelinesSectionId = 'how-it-works';

export function isGuidelinesSectionId(value: string): value is GuidelinesSectionId {
  return GUIDELINES_TOC.some((item) => item.id === value);
}

export function sectionMeta(id: GuidelinesSectionId) {
  return GUIDELINES_TOC.find((item) => item.id === id)!;
}
