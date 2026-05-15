import type { GuidelinesSectionId, GuidelinesTocItem } from './types';

export const GUIDELINES_TOC: GuidelinesTocItem[] = [
  {
    id: 'how-it-works',
    number: '01',
    label: 'How GrantOS v3 Works',
    shortLabel: 'How It Works',
  },
  {
    id: 'zk-proof',
    number: '02',
    label: 'ZK Proof Verification Explained',
    shortLabel: 'ZK Proof',
  },
  {
    id: 'committee',
    number: '03',
    label: 'Committee Member Responsibilities',
    shortLabel: 'Committee',
  },
  {
    id: 'builder-rights',
    number: '04',
    label: 'Builder Rights and Due Process',
    shortLabel: 'Builder Rights',
  },
  {
    id: 'slashing',
    number: '05',
    label: 'Slashing Rules',
    shortLabel: 'Slashing',
  },
  {
    id: 'reputation',
    number: '06',
    label: 'Reputation Scoring System',
    shortLabel: 'Reputation',
  },
  {
    id: 'faq',
    number: '07',
    label: 'FAQ',
    shortLabel: 'FAQ',
  },
  {
    id: 'contracts',
    number: '08',
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
