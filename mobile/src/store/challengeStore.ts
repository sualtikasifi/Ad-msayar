import { create } from 'zustand';
import * as challengesApi from '../api/challenges';
import type { Challenge, ChallengeDetail } from '../types';

interface ChallengeState {
  challenges: Challenge[];
  activeChallengeDetail: ChallengeDetail | null;
  isLoading: boolean;

  loadChallenges: () => Promise<void>;
  loadChallengeDetail: (id: string) => Promise<void>;
  acceptChallenge: (id: string) => Promise<void>;
  declineChallenge: (id: string) => Promise<void>;
  cancelChallenge: (id: string) => Promise<void>;
  updateDetailRankings: (detail: Partial<ChallengeDetail>) => void;
  reset: () => void;
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  challenges: [],
  activeChallengeDetail: null,
  isLoading: false,

  reset: () => set({ challenges: [], activeChallengeDetail: null, isLoading: false }),

  loadChallenges: async () => {
    set({ isLoading: true });
    try {
      const challenges = await challengesApi.getMyChallenges();
      set({ challenges });
    } finally {
      set({ isLoading: false });
    }
  },

  loadChallengeDetail: async (id) => {
    set({ isLoading: true });
    try {
      const detail = await challengesApi.getChallengeDetail(id);
      set({ activeChallengeDetail: detail });
    } finally {
      set({ isLoading: false });
    }
  },

  acceptChallenge: async (id) => {
    await challengesApi.acceptChallenge(id);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === id ? { ...c, my_status: 'accepted' } : c
      ),
    }));
  },

  declineChallenge: async (id) => {
    await challengesApi.declineChallenge(id);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === id ? { ...c, my_status: 'declined' } : c
      ),
    }));
  },

  cancelChallenge: async (id) => {
    await challengesApi.cancelChallenge(id);
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === id ? { ...c, status: 'cancelled' } : c
      ),
    }));
  },

  updateDetailRankings: (detail) => {
    set((state) => ({
      activeChallengeDetail: state.activeChallengeDetail
        ? { ...state.activeChallengeDetail, ...detail }
        : null,
    }));
  },
}));
