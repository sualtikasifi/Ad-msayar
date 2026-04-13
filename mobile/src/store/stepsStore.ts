import { create } from 'zustand';
import * as stepsApi from '../api/steps';

interface StepsState {
  todaySteps: number;
  isTracking: boolean;
  lastSyncedAt: Date | null;

  setTodaySteps: (count: number) => void;
  setTracking: (tracking: boolean) => void;
  syncToServer: (count: number) => Promise<void>;
  loadTodayFromServer: () => Promise<void>;
}

export const useStepsStore = create<StepsState>((set) => ({
  todaySteps: 0,
  isTracking: false,
  lastSyncedAt: null,

  setTodaySteps: (count) => set({ todaySteps: count }),

  setTracking: (tracking) => set({ isTracking: tracking }),

  syncToServer: async (count) => {
    const today = new Date().toISOString().split('T')[0];
    await stepsApi.syncSteps(today, count);
    set({ todaySteps: count, lastSyncedAt: new Date() });
  },

  loadTodayFromServer: async () => {
    const { step_count } = await stepsApi.getTodaySteps();
    set({ todaySteps: step_count });
  },
}));
