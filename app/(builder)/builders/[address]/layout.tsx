import { formatBuilderPageTitle } from '@/lib/builder-profile-server';
import { parseProfileAddress } from '@/lib/profile-address';
import type { Metadata } from 'next';

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

export default function BuilderProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
