import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string; milestoneId: string }>;
};

export default async function MilestoneSubmitIndexPage({ params }: Props) {
  const { id, milestoneId } = await params;
  redirect(
    `/grants/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}/submit/context`
  );
}
