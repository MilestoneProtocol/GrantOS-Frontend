'use client';

import { generateTasks } from '@/lib/tasks';
import { useGrantActivityWatcher } from '@/lib/grant-events';
import { useTasksStore } from '@/store/tasksStore';
import { useCallback, useEffect, useRef } from 'react';
import type { Address } from 'viem';

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

  // Any on-chain grant activity (submission, vote, warning, slash, …) should
  // re-derive the task queue immediately rather than waiting for the poll.
  useGrantActivityWatcher(() => void refresh(), enabled && Boolean(address));

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
