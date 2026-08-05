import { create } from 'zustand';
import * as friendsApi from '../api/friends';
import type { FriendWithSteps, FriendRequest } from '../types';

interface FriendState {
  friends: FriendWithSteps[];
  pendingRequests: FriendRequest[];
  isLoading: boolean;

  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  reset: () => void;
}

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  pendingRequests: [],
  isLoading: false,

  reset: () => set({ friends: [], pendingRequests: [], isLoading: false }),

  loadFriends: async () => {
    set({ isLoading: true });
    try {
      const friends = await friendsApi.getFriends();
      set({ friends });
    } finally {
      set({ isLoading: false });
    }
  },

  loadPendingRequests: async () => {
    const requests = await friendsApi.getPendingRequests();
    set({ pendingRequests: requests });
  },

  sendRequest: async (userId) => {
    await friendsApi.sendFriendRequest(userId);
  },

  acceptRequest: async (friendshipId) => {
    await friendsApi.acceptRequest(friendshipId);
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== friendshipId),
    }));
  },

  declineRequest: async (friendshipId) => {
    await friendsApi.declineRequest(friendshipId);
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== friendshipId),
    }));
  },

  removeFriend: async (friendshipId) => {
    await friendsApi.removeFriend(friendshipId);
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendshipId),
    }));
  },
}));
