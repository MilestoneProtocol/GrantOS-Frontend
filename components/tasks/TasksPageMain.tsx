'use client';

import TasksEmptyState from '@/components/tasks/TasksEmptyState';
import TasksList from '@/components/tasks/TasksList';
import TasksSummaryBar from '@/components/tasks/TasksSummaryBar';
import { useTasksQueue } from '@/hooks/useTasksQueue';
import { useTasksStore } from '@/store/tasksStore';
import { useCallback, useState } from 'react';
import type { Address } from 'viem';

type TasksPageMainProps = {
  address: Address;
};

export default function TasksPageMain({ address }: TasksPageMainProps) {
  const queue = useTasksStore((s) => s.queue);
  const sessionCompleted = useTasksStore((s) => s.sessionCompleted);
  const { completeTask } = useTasksQueue(address, true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback(
    async (taskId: string) => {
      setRemovingIds((prev) => new Set(prev).add(taskId));
      await completeTask(taskId);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    },
    [completeTask],
  );

  const visibleTasks = queue.tasks.filter((t) => !removingIds.has(t.taskId));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Action Queue
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Personal priority list across all grants.
        </p>
      </header>

      <TasksSummaryBar summary={queue.summary} />

      {visibleTasks.length === 0 ? (
        <TasksEmptyState />
      ) : (
        <TasksList tasks={visibleTasks} removingIds={removingIds} onComplete={handleComplete} />
      )}

      {sessionCompleted > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {sessionCompleted} task{sessionCompleted === 1 ? '' : 's'} completed this session
        </p>
      ) : null}
    </main>
  );
}
