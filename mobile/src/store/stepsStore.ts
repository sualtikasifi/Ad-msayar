import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as stepsApi from '../api/steps';
import { today as todayLocalDate } from '../utils/dateHelpers';

const CACHE_KEY = 'lastKnownSteps';

interface StepsState {
  todaySteps: number;
  isTracking: boolean;
  lastSyncedAt: Date | null;

  setTodaySteps: (count: number) => void;
  setTracking: (tracking: boolean) => void;
  syncToServer: (count: number) => Promise<void>;
  loadTodayFromServer: () => Promise<void>;
  hydrateFromCache: () => Promise<void>;
  reset: () => void;
}

function persistCache(count: number) {
  SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({ date: todayLocalDate(), count })).catch(() => {});
}

export const useStepsStore = create<StepsState>((set) => ({
  todaySteps: 0,
  isTracking: false,
  lastSyncedAt: null,

  reset: () => set({ todaySteps: 0, lastSyncedAt: null }),

  setTodaySteps: (count) => {
    set({ todaySteps: count });
    persistCache(count);
  },

  setTracking: (tracking) => set({ isTracking: tracking }),

  syncToServer: async (count) => {
    await stepsApi.syncSteps(todayLocalDate(), count);
    set({ todaySteps: count, lastSyncedAt: new Date() });
    persistCache(count);
  },

  loadTodayFromServer: async () => {
    const { step_count } = await stepsApi.getTodaySteps();
    // Never let a server pull decrease the count: if a live pedometer sync
    // hasn't reached the server yet (in flight, or a previous sync silently
    // failed), pulling from the server would otherwise overwrite a correct,
    // higher local value with a stale one.
    set((state) => ({ todaySteps: Math.max(step_count, state.todaySteps) }));
  },

  // Reads yesterday's-session-end cached value so the step ring can paint a
  // real number immediately on cold start instead of sitting at 0 for the
  // few seconds it takes the server round-trip (loadTodayFromServer) to
  // resolve. Safe because every setter above only ever increases the count.
  hydrateFromCache: async () => {
    try {
      const stored = await SecureStore.getItemAsync(CACHE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { date: string; count: number };
      if (parsed.date !== todayLocalDate()) return;
      set((state) => ({ todaySteps: Math.max(parsed.count, state.todaySteps) }));
    } catch {
      /* ignore — cache is best-effort */
    }
  },
}));
