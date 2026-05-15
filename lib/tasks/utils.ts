import type { CommitteeTask, TasksSummary, TaskPriority } from './types';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  urgent: 1,
  normal: 2,
};

export function sortTasks(tasks: CommitteeTask[]): CommitteeTask[] {
  return [...tasks].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

export function tasksBadgeCount(tasks: CommitteeTask[]): number {
  return tasks.filter((t) => t.priority === 'critical' || t.priority === 'urgent').length;
}

export function computeTasksSummary(tasks: CommitteeTask[]): TasksSummary {
  let urgent = 0;
  let pending = 0;
  let awaitingQuorum = 0;

  for (const t of tasks) {
    if (t.type === 'AWAITING_QUORUM') {
      awaitingQuorum += 1;
    } else if (t.isWithin24Hours || t.priority === 'critical') {
      urgent += 1;
    } else {
      pending += 1;
    }
  }

  return {
    urgent,
    pending,
    awaitingQuorum,
    completedToday: 0,
  };
}

export function groupTasksByPriority(tasks: CommitteeTask[]) {
  return {
    critical: tasks.filter((t) => t.priority === 'critical'),
    urgent: tasks.filter((t) => t.priority === 'urgent'),
    normal: tasks.filter((t) => t.priority === 'normal'),
  };
}

export const PRIORITY_SECTION_LABEL: Record<TaskPriority, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  normal: 'Normal',
};
