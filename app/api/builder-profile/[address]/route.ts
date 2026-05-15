import { loadBuilderProfile } from '@/lib/builder-profile-server';
import { NextResponse } from 'next/server';

/** Client-safe builder profile aggregate (identity, grants, stats). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;
  const data = await loadBuilderProfile(address ?? '');
  return NextResponse.json(data);
}
