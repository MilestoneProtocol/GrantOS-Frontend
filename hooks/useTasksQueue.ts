'use client';

import { generateTasks } from '@/lib/tasks';
import { grantEscrowEventsAbi } from '@/lib/notifications';
import { GRANT_ESCROW_ADDRESS } from '@/lib/escrow';
import { useTasksStore } from '@/store/tasksStore';
import { useCallback, useEffect, useRef } from 'react';
import type { Address } from 'viem';
import { useWatchContractEvent } from 'wagmi';

const POLL_MS = 60_000;

export function useTasksQueue(address: Address | undefined, enabled: boolean) {
  const setQueue = useTasksStore((s) => s.setQueue);
  const removingRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!address || !enabled) return;
    const queue = await generateTasks(address);
    const removing = removingRef.current;
    if (removing.size > 0) {
      queue.tasks = queue.tasks.filter((t) => !removing.has(t.taskId));
    }
    setQueue(queue);
  }, [address, enabled, setQueue]);

  useEffect(() => {
    if (!enabled || !address) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [address, enabled, refresh]);

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneSubmitted',
    enabled: enabled && Boolean(address),
    onLogs: () => void refresh(),
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'VoteCast',
    enabled: enabled && Boolean(address),
    onLogs: () => void refresh(),
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'WarningIssued',
    enabled: enabled && Boolean(address),
    onLogs: () => void refresh(),
  });

  useWatchContractEvent({
    address: GRANT_ESCROW_ADDRESS,
    abi: grantEscrowEventsAbi,
    eventName: 'MilestoneSlashed',
    enabled: enabled && Boolean(address),
    onLogs: () => void refresh(),
  });

  const markTaskRemoving = useCallback((taskId: string) => {
    removingRef.current.add(taskId);
  }, []);

  const completeTask = useCallback(
    async (taskId: string) => {
      markTaskRemoving(taskId);
      useTasksStore.getState().incrementSessionCompleted();
      await new Promise((r) => setTimeout(r, 320));
      await refresh();
      removingRef.current.delete(taskId);
    },
    [markTaskRemoving, refresh],
  );

  return { refresh, completeTask, markTaskRemoving };
}
