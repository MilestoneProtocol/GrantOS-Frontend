/**
 * Backend API configuration.
 *
 * - Browser / client components: use `getPublicApiV1Base()` → `/api/v1` (proxied by Next.js to BACKEND_URL).
 * - Server components / server actions: use `getServerApiV1Base()` → direct Render URL.
 */
const DEFAULT_BACKEND_ORIGIN = 'https://grantos-backend-9f5v.onrender.com';

export function getBackendOrigin(): string {
  const raw = process.env.BACKEND_URL?.trim();
  return (raw || DEFAULT_BACKEND_ORIGIN).replace(/\/+$/, '');
}

/** Same-origin path proxied in `next.config.ts` rewrites. */
export function getPublicApiV1Base(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return '/api/v1';
}

/** Full URL for server-side fetch (bypasses Next rewrite). */
export function getServerApiV1Base(): string {
  return `${getBackendOrigin()}/api/v1`;
}

/**
 * Public backend origin usable from the browser — needed for the WebSocket
 * notification connection, which can't go through the Next.js HTTP rewrite.
 * Reads a `NEXT_PUBLIC_*` var (inlined into the client bundle) and falls back
 * to the default Render origin.
 */
export function getPublicBackendOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WS_URL?.trim();
  return (raw || DEFAULT_BACKEND_ORIGIN).replace(/\/+$/, '');
}
