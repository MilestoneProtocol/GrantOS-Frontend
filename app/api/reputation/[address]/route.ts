import { calculateReputationScore } from '@/lib/reputation';
import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

/**
 * Smoke-test endpoint for `calculateReputationScore` (EAS indexer + parsing + deltas).
 *
 * - **Development:** enabled by default (`pnpm dev` → curl below).
 * - **Production:** returns 404 unless `GRANTOS_ALLOW_REPUTATION_DEBUG=true`.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const allow =
    process.env.NODE_ENV !== 'production' ||
    process.env.GRANTOS_ALLOW_REPUTATION_DEBUG === 'true';

  if (!allow) {
    return NextResponse.json(
      {
        error:
          'Reputation debug API is disabled in production. Set GRANTOS_ALLOW_REPUTATION_DEBUG=true to enable.',
      },
      { status: 404 },
    );
  }

  const { address } = await context.params;
  const raw = decodeURIComponent(address ?? '').trim();
  if (!raw || !isAddress(raw)) {
    return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
  }

  try {
    const result = await calculateReputationScore(raw);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
