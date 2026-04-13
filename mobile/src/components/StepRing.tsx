import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface StepRingProps {
  steps: number;
  goal?: number;
  size?: number;
}

const COLORS = {
  primary: '#6C63FF',
  secondary: '#E8E6FF',
  text: '#1A1A2E',
  subtext: '#6B7280',
};

export function StepRing({ steps, goal = 10000, size = 200 }: StepRingProps) {
  const progress = Math.min(steps / goal, 1);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedStyle = useAnimatedStyle(() => ({
    // Used for visual indicator below the SVG
    opacity: 1,
  }));

  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.ring,
          styles.bgRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: COLORS.secondary,
          },
        ]}
      />

      {/* Center content */}
      <View style={styles.center}>
        <Animated.View style={animatedStyle}>
          <Text style={[styles.stepCount, { fontSize: size * 0.18 }]}>
            {steps.toLocaleString()}
          </Text>
          <Text style={[styles.stepLabel, { fontSize: size * 0.07 }]}>adım</Text>
          <Text style={[styles.goalText, { fontSize: size * 0.065 }]}>
            {percentage}% • hedef {goal.toLocaleString()}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
  },
  bgRing: {},
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  stepLabel: {
    color: COLORS.subtext,
    textAlign: 'center',
    marginTop: 2,
  },
  goalText: {
    color: COLORS.subtext,
    textAlign: 'center',
    marginTop: 4,
  },
});
