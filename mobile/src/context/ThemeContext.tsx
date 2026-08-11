import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgGradientTop: string;
  bgGradientBottom: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  glow: string;
}

export const MEDAL_COLORS = {
  gold: '#F5C542',
  silver: '#C0C6D4',
  bronze: '#D08A4E',
};

const LIGHT: ThemeColors = {
  bg: '#F8F7FF',
  bgGradientTop: '#F8F7FF',
  bgGradientBottom: '#F8F7FF',
  card: '#FFFFFF',
  cardAlt: '#F3F4F6',
  border: '#E5E7EB',
  text: '#1A1A2E',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  primary: '#6C63FF',
  primaryLight: '#E8E6FF',
  accent: '#0EA5B7',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  tabBar: '#FFFFFF',
  glow: '#6C63FF',
};

const DARK: ThemeColors = {
  bg: '#0D0B1F',
  bgGradientTop: '#1C1440',
  bgGradientBottom: '#0A0817',
  card: '#1A1730',
  cardAlt: '#221D45',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5F3FF',
  textSecondary: '#C9C5E0',
  textMuted: '#8B87A8',
  primary: '#8B5CF6',
  primaryLight: '#2D2560',
  accent: '#22D3EE',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  tabBar: 'rgba(17,14,36,0.96)',
  glow: '#8B5CF6',
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
