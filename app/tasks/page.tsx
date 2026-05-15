'use client';

import CommitteeAccessDeniedToast from '@/components/committee/CommitteeAccessDeniedToast';
import CommitteeAppShell from '@/components/committee/CommitteeAppShell';
import CommitteeReviewSkeleton from '@/components/committee/CommitteeReviewSkeleton';
import TasksPageMain from '@/components/tasks/TasksPageMain';
import { useRoleDetection } from '@/lib/roleDetection';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

const MIN_VALIDATION_MS = 1500;
const ACCESS_DENIED_LINGER_MS = 1600;

export default function TasksPage() {
  const router = useRouter();
  const { address, isConnected, status } = useAccount();
  const roles = useRoleDetection();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showDeniedToast, setShowDeniedToast] = useState(false);

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_VALIDATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!walletResolved) return;

    if (!isConnected) {
      router.replace(
        `/?toast=connect_wallet&m=${encodeURIComponent('Connect your wallet to continue.')}&from=${encodeURIComponent('/tasks')}`,
      );
      return;
    }

    if (!roles.loading && !roles.isCommittee) {
      setShowDeniedToast(true);
      const t = window.setTimeout(() => {
        router.replace(
          `/?toast=not_committee&m=${encodeURIComponent('You are not a committee member.')}&from=${encodeURIComponent('/tasks')}`,
        );
      }, ACCESS_DENIED_LINGER_MS);
      return () => window.clearTimeout(t);
    }
  }, [isConnected, roles.isCommittee, roles.loading, router, walletResolved]);

  const authorized =
    minTimeElapsed && walletResolved && isConnected && !roles.loading && roles.isCommittee;

  const pendingReviews = 0;

  return (
    <CommitteeAppShell breadcrumb="Action Queue" reviewsBadge={pendingReviews}>
      {showDeniedToast ? <CommitteeAccessDeniedToast /> : null}
      {authorized && address ? (
        <TasksPageMain address={address} />
      ) : (
        <CommitteeReviewSkeleton />
      )}
    </CommitteeAppShell>
  );
}
