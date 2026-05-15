'use client';

import TaskCard from '@/components/tasks/TaskCard';
import { groupTasksByPriority, PRIORITY_SECTION_LABEL } from '@/lib/tasks';
import type { CommitteeTask, TaskPriority } from '@/lib/tasks/types';

const SECTION_DOT: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  urgent: 'bg-orange-500',
  normal: 'bg-blue-500',
};

type TasksListProps = {
  tasks: CommitteeTask[];
  removingIds: Set<string>;
  onComplete: (taskId: string) => void;
};

export default function TasksList({ tasks, removingIds, onComplete }: TasksListProps) {
  const groups = groupTasksByPriority(tasks);
  const sections: TaskPriority[] = ['critical', 'urgent', 'normal'];

  return (
    <section className="space-y-8" aria-label="Action queue">
      {sections.map((priority) => {
        const list = groups[priority];
        if (list.length === 0) return null;
        return (
          <section key={priority} className="relative">
            <header className="sticky top-28 z-10 -mx-1 mb-3 flex items-center gap-2 bg-slate-50/95 py-2 backdrop-blur dark:bg-slate-950/90 sm:top-32">
              <span className={`h-2 w-2 rounded-full ${SECTION_DOT[priority]}`} aria-hidden />
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {PRIORITY_SECTION_LABEL[priority]}
              </h2>
            </header>
            <ul className="space-y-4">
              {list.map((task) => (
                <li key={task.taskId}>
                  <TaskCard
                    task={task}
                    onComplete={onComplete}
                    removing={removingIds.has(task.taskId)}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
