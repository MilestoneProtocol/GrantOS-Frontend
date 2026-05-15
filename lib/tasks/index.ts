import { isUiDemoMode } from '@/demo';
import type { Address } from 'viem';
import { generateTasksDemo } from './demo';
import type { TasksQueue } from './types';

export type { CommitteeTask, TaskPriority, TaskType, TasksQueue, TasksSummary } from './types';
export { groupTasksByPriority, PRIORITY_SECTION_LABEL, sortTasks, tasksBadgeCount } from './utils';

const EMPTY_QUEUE: TasksQueue = {
  tasks: [],
  summary: { urgent: 0, pending: 0, awaitingQuorum: 0, completedToday: 0 },
  badgeCount: 0,
};

/**
 * Builds the committee member's personal action queue.
 *
 * Demo mode synthesises from committee fixtures. Production path batches
 * `getCommitteeGrants` → `getGrant` → `getMilestoneStatus` (extend as contracts ship).
 */
export async function generateTasks(address: Address): Promise<TasksQueue> {
  if (isUiDemoMode()) {
    return generateTasksDemo(address);
  }

  // Contract reads land here; return empty until escrow view fns are wired end-to-end.
  return EMPTY_QUEUE;
}
