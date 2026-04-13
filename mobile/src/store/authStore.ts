import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as authApi from '../api/auth';
import type { PublicUser } from '../types';

interface AuthState {
  user: (PublicUser & { email?: string }) | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearSession: () => Promise<void>;
  updateUser: (partial: Partial<PublicUser & { email?: string }>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  loadFromStorage: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
      ]);

      if (accessToken && refreshToken && userStr) {
        set({
          accessToken,
          refreshToken,
          user: JSON.parse(userStr),
          isAuthenticated: true,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { accessToken, refreshToken, user } = await authApi.login(email, password);
    await Promise.all([
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('refreshToken', refreshToken),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  register: async (username, email, password) => {
    const { accessToken, refreshToken, user } = await authApi.register(username, email, password);
    await Promise.all([
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('refreshToken', refreshToken),
      SecureStore.setItemAsync('user', JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    await get().clearSession();
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('user'),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  updateUser: async (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    set({ user: updated });
  },
}));
