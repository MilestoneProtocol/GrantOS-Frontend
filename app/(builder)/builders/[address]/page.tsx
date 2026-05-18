import OnboardingShell from '@/app/(onboarding)/OnboardingShell';
import BuilderProfileContent from '@/components/builders/BuilderProfileContent';
import { getDaoDashboardSnapshot } from '@/demo/dao-dashboard';
import {
  formatBuilderPageTitle,
  loadBuilderProfile,
} from '@/lib/builder-profile-server';
import { parseProfileAddress } from '@/lib/profile-address';
import type { Address } from 'viem';
import type { Metadata } from 'next';

export const dynamicParams = true;

export function generateStaticParams(): { address: string }[] {
  const snap = getDaoDashboardSnapshot(0);
  const builders = [...new Set(snap.grants.map((g) => g.builder))];
  return builders.map((address) => ({ address: address.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address: raw } = await params;
  const trimmed = decodeURIComponent(raw ?? '').trim();
  const address = parseProfileAddress(trimmed);
  if (!address) {
    return { title: 'Builder — GrantOS v3' };
  }
  return { title: formatBuilderPageTitle(address) };
}

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: raw } = await params;
  const data = await loadBuilderProfile(raw ?? '');

  return (
    <OnboardingShell>
      <BuilderProfileContent data={data} />
    </OnboardingShell>
  );
}
