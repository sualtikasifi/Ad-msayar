import { create } from 'zustand';
import * as achievementsApi from '../api/achievements';
import type { Achievement, AchievementsResponse } from '../api/achievements';

interface AchievementState {
  data: AchievementsResponse | null;
  isLoading: boolean;
  // Queue of newly earned achievements to show as toasts
  pendingToasts: Achievement[];

  loadAchievements: () => Promise<void>;
  addPendingToast: (achievement: Achievement) => void;
  dismissToast: () => void;
}

export const useAchievementStore = create<AchievementState>((set) => ({
  data: null,
  isLoading: false,
  pendingToasts: [],

  loadAchievements: async () => {
    set({ isLoading: true });
    try {
      const data = await achievementsApi.getMyAchievements();
      set({ data });
    } finally {
      set({ isLoading: false });
    }
  },

  addPendingToast: (achievement) => {
    set((state) => ({
      pendingToasts: [...state.pendingToasts, achievement],
    }));
  },

  dismissToast: () => {
    set((state) => ({
      pendingToasts: state.pendingToasts.slice(1),
    }));
  },
}));
