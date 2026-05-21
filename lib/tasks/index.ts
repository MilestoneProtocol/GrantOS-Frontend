import type { Address } from 'viem';
import type { TasksQueue } from './types';

export type { CommitteeTask, TaskPriority, TaskType, TasksQueue, TasksSummary } from './types';
export { groupTasksByPriority, PRIORITY_SECTION_LABEL, sortTasks, tasksBadgeCount } from './utils';

const EMPTY_QUEUE: TasksQueue = {
  tasks: [],
  summary: { urgent: 0, pending: 0, awaitingQuorum: 0, completedToday: 0 },
  badgeCount: 0,
};

/**
 * Builds the committee member's personal action queue from chain reads.
 */
export async function generateTasks(_address: Address): Promise<TasksQueue> {
  return EMPTY_QUEUE;
}
