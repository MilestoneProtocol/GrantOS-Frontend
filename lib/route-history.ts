export const ROUTE_HISTORY_KEY = 'grantos:route-history';
const MAX_ROUTE_HISTORY = 32;

function normalizeRoute(route: string) {
  const trimmed = route.trim();
  return trimmed || '/';
}

export function readRouteHistory() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(ROUTE_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(normalizeRoute);
  } catch {
    return [];
  }
}

export function writeRouteHistory(history: string[]) {
  if (typeof window === 'undefined') return;

  const normalized = history
    .filter((value) => value.trim().length > 0)
    .map(normalizeRoute)
    .slice(-MAX_ROUTE_HISTORY);

  window.sessionStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(normalized));
}

export function pushRouteHistory(route: string) {
  const normalizedRoute = normalizeRoute(route);
  const history = readRouteHistory();

  if (history[history.length - 1] === normalizedRoute) return history;

  const nextHistory = [...history, normalizedRoute].slice(-MAX_ROUTE_HISTORY);
  writeRouteHistory(nextHistory);
  return nextHistory;
}

export function getPreviousRoute(currentRoute: string) {
  const normalizedCurrentRoute = normalizeRoute(currentRoute);
  const history = readRouteHistory();

  for (let i = history.length - 2; i >= 0; i -= 1) {
    if (history[i] !== normalizedCurrentRoute) {
      return history[i];
    }
  }

  return null;
}
