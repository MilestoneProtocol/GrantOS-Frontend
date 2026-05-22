export type GrantDetailContext = 'public' | 'builder' | 'committee' | 'dao' | 'treasury';

/** Role-scoped grant detail URL (public explorer stays on `/grants/[id]`). */
export function grantDetailPath(
  segment: string,
  context: GrantDetailContext = 'public',
): string {
  const id = encodeURIComponent(segment);
  switch (context) {
    case 'builder':
      return `/builder/grants/${id}`;
    case 'committee':
      return `/committee/grants/${id}`;
    case 'dao':
      return `/dao/grants/${id}`;
    case 'treasury':
      return `/treasury/grants/${id}`;
    default:
      return `/grants/${id}`;
  }
}

/** Milestone flows (submit / warning) stay under `/grants/…` with builder chrome in layout. */
export function grantMilestonePath(
  segment: string,
  milestoneIndex: number | string,
  suffix: 'submit' | 'warning',
): string {
  return `/grants/${encodeURIComponent(segment)}/milestones/${encodeURIComponent(String(milestoneIndex))}/${suffix}`;
}
