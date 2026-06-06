import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const label = id?.trim() || '—';
  return {
    title: `Grant #${label} — GrantOS`,
    description: 'Public grant detail, milestones, and committee activity on GrantOS.',
  };
}

export default function GrantDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
