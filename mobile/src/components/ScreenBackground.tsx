import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Full-screen gradient wrapper — flat color in light mode, a subtle
 * top-to-bottom purple glow in dark mode to match the app's neon look.
 */
export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  const { colors, isDark } = useTheme();

  if (!isDark) {
    return (
      <LinearGradient
        colors={[colors.bg, colors.bg]}
        style={[styles.fill, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.bgGradientTop, colors.bg, colors.bgGradientBottom]}
      locations={[0, 0.35, 1]}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
