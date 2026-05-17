export type GuidelinesSectionId =
  | 'how-it-works'
  | 'zk-proof'
  | 'committee'
  | 'builder-rights'
  | 'slashing'
  | 'reputation'
  | 'faq'
  | 'contracts';

export type GuidelinesTocItem = {
  id: GuidelinesSectionId;
  label: string;
  shortLabel: string;
};
