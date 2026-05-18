import { isUiDemoMode } from '@/demo';
import { CONTRACTS_READY } from '@/lib/escrow';

/**
 * When true, on-chain role detection is skipped and any connected wallet may
 * open builder, committee, and DAO surfaces without grant/committee history.
 *
 * Enabled when:
 * - `NEXT_PUBLIC_GRANTOS_SKIP_ROLE_CHECKS=true` in `.env.local`, or
 * - `NEXT_PUBLIC_GRANTOS_UI_DEMO=true`, or
 * - contract addresses are still placeholders (`CONTRACTS_READY` is false).
 */
export function isRoleCheckBypassed(): boolean {
  const raw = process.env.NEXT_PUBLIC_GRANTOS_SKIP_ROLE_CHECKS?.trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0') return false;
  if (!CONTRACTS_READY) return true;
  return isUiDemoMode();
}
