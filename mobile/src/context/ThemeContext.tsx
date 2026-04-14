import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
}

const LIGHT: ThemeColors = {
  bg: '#F8F7FF',
  card: '#FFFFFF',
  cardAlt: '#F3F4F6',
  border: '#E5E7EB',
  text: '#1A1A2E',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  primary: '#6C63FF',
  primaryLight: '#E8E6FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  tabBar: '#FFFFFF',
};

const DARK: ThemeColors = {
  bg: '#0F0F1A',
  card: '#1A1A2E',
  cardAlt: '#252540',
  border: '#2D2D4E',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#6B7280',
  primary: '#8B83FF',
  primaryLight: '#2D2A5A',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  tabBar: '#1A1A2E',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  colors: LIGHT,
  isDark: false,
  setMode: () => {},
});

const STORAGE_KEY = 'themeMode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    }).catch(() => {});
  }, []);

  async function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    await SecureStore.setItemAsync(STORAGE_KEY, newMode).catch(() => {});
  }

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
