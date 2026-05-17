/**
 * Guidelines URL for the current app shell — avoids sending builder/DAO/committee
 * users to the public onboarding `/guidelines` route.
 */
export function guidelinesPathForPathname(pathname: string | null): string {
  if (!pathname) return '/guidelines';
  if (pathname.startsWith('/builder') || pathname.startsWith('/my-grants')) {
    return '/builder/guidelines';
  }
  if (
    pathname.startsWith('/committee') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/grants/new')
  ) {
    return '/committee/guidelines';
  }
  if (pathname.startsWith('/dao') || pathname.startsWith('/treasury')) {
    return '/dao/guidelines';
  }
  if (pathname.startsWith('/grants/') && pathname.includes('/milestones/')) {
    return '/builder/guidelines';
  }
  return '/guidelines';
}
