'use client';

import { useTasksQueue } from '@/hooks/useTasksQueue';
import { useRoleDetection } from '@/lib/roleDetection';
import { useAccount } from 'wagmi';

/**
 * Polls the action queue for sidebar badge counts on every committee route.
 */
export default function TasksBadgeSync() {
  const { address, isConnected } = useAccount();
  const roles = useRoleDetection();
  const enabled = isConnected && !roles.loading && roles.isCommittee;

  useTasksQueue(address, enabled);

  return null;
}
