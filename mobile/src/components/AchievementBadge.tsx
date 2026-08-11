import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Achievement } from '../api/achievements';
import { useTheme } from '@/context/ThemeContext';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  steps:     '#6C63FF',
  streak:    '#EF4444',
  social:    '#10B981',
  challenge: '#F59E0B',
};

export function AchievementBadge({ achievement, size = 'md', onPress }: AchievementBadgeProps) {
  const { colors } = useTheme();
  const color = CATEGORY_COLORS[achievement.category] || colors.textMuted;
  const locked = !achievement.earned;

  const sizeConfig = {
    sm: { container: 64, emoji: 22, name: 10 },
    md: { container: 88, emoji: 30, name: 11 },
    lg: { container: 108, emoji: 38, name: 13 },
  }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View
        style={[
          styles.container,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container / 2,
            borderColor: locked ? colors.border : color,
            backgroundColor: locked ? colors.cardAlt : color + '22',
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: sizeConfig.emoji, opacity: locked ? 0.3 : 1 }]}>
          {achievement.emoji}
        </Text>
        {locked && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>🔒</Text></View>}
      </View>
      <Text
        style={[styles.name, { fontSize: sizeConfig.name, color: locked ? colors.textMuted : colors.textSecondary }]}
        numberOfLines={2}
      >
        {achievement.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  lockIcon: {
    fontSize: 14,
  },
  name: {
    textAlign: 'center',
    fontWeight: '600',
    width: '100%',
  },
});
