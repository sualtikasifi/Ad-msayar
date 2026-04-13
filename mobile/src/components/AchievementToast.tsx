import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useAchievementStore } from '../store/achievementStore';
import type { Achievement } from '../api/achievements';

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

function Toast({ achievement, onDismiss }: AchievementToastProps) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(-10, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
      withDelay(2800, withTiming(-120, { duration: 350, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(onDismiss)();
      }))
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2900, withTiming(0, { duration: 200 }))
    );
  }, [translateY, opacity, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, animatedStyle]}>
      <Text style={styles.toastEmoji}>{achievement.emoji}</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>Rozet Kazandın! 🎉</Text>
        <Text style={styles.toastName}>{achievement.name}</Text>
        <Text style={styles.toastXp}>+{achievement.xp} XP</Text>
      </View>
    </Animated.View>
  );
}

export function AchievementToastManager() {
  const { pendingToasts, dismissToast } = useAchievementStore();
  const current = pendingToasts[0];

  if (!current) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Toast key={current.id} achievement={current} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 60,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 280,
  },
  toastEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  toastName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toastXp: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '700',
    marginTop: 2,
  },
});
