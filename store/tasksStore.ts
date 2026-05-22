import type { TasksQueue } from '@/lib/tasks/types';
import { create } from 'zustand';

type TasksStore = {
  queue: TasksQueue;
  sessionCompleted: number;
  setQueue: (queue: TasksQueue) => void;
  incrementSessionCompleted: () => void;
  bumpCompletedToday: () => void;
};

const EMPTY: TasksQueue = {
  tasks: [],
  summary: { urgent: 0, pending: 0, awaitingQuorum: 0, completedToday: 0 },
  badgeCount: 0,
};

export const useTasksStore = create<TasksStore>((set) => ({
  queue: EMPTY,
  sessionCompleted: 0,
  setQueue: (queue) => set({ queue }),
  incrementSessionCompleted: () =>
    set((s) => ({
      sessionCompleted: s.sessionCompleted + 1,
      queue: {
        ...s.queue,
        summary: {
          ...s.queue.summary,
          completedToday: s.queue.summary.completedToday + 1,
        },
      },
    })),
  bumpCompletedToday: () =>
    set((s) => ({
      queue: {
        ...s.queue,
        summary: { ...s.queue.summary, completedToday: s.queue.summary.completedToday + 1 },
      },
    })),
}));
