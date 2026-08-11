import { create } from 'zustand';
import * as stepsApi from '../api/steps';
import { today as todayLocalDate } from '../utils/dateHelpers';

interface StepsState {
  todaySteps: number;
  isTracking: boolean;
  lastSyncedAt: Date | null;

  setTodaySteps: (count: number) => void;
  setTracking: (tracking: boolean) => void;
  syncToServer: (count: number) => Promise<void>;
  loadTodayFromServer: () => Promise<void>;
  reset: () => void;
}

export const useStepsStore = create<StepsState>((set) => ({
  todaySteps: 0,
  isTracking: false,
  lastSyncedAt: null,

  reset: () => set({ todaySteps: 0, lastSyncedAt: null }),

  setTodaySteps: (count) => set({ todaySteps: count }),

  setTracking: (tracking) => set({ isTracking: tracking }),

  syncToServer: async (count) => {
    await stepsApi.syncSteps(todayLocalDate(), count);
    set({ todaySteps: count, lastSyncedAt: new Date() });
  },

  loadTodayFromServer: async () => {
    const { step_count } = await stepsApi.getTodaySteps();
    // Never let a server pull decrease the count: if a live pedometer sync
    // hasn't reached the server yet (in flight, or a previous sync silently
    // failed), pulling from the server would otherwise overwrite a correct,
    // higher local value with a stale one.
    set((state) => ({ todaySteps: Math.max(step_count, state.todaySteps) }));
  },
}));
