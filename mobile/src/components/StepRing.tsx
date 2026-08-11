import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StepRingProps {
  steps: number;
  goal?: number;
  size?: number;
}

export function StepRing({ steps, goal = 10000, size = 220 }: StepRingProps) {
  const { colors, isDark } = useTheme();
  const progress = Math.min(steps / goal, 1);
  const animatedProgress = useSharedValue(0);
  const [displayPercent, setDisplayPercent] = useState(Math.round(progress * 100));

  useEffect(() => {
    animatedProgress.value = withTiming(
      progress,
      { duration: 900, easing: Easing.out(Easing.cubic) },
      () => runOnJS(setDisplayPercent)(Math.round(progress * 100))
    );
  }, [progress, animatedProgress]);

  const strokeWidth = size * 0.09;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={isDark ? styles.glow : undefined}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="100%" stopColor={colors.accent} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.cardAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.stepCount, { fontSize: size * 0.19, color: colors.text }]}>
          {steps.toLocaleString('tr-TR')}
        </Text>
        <Text style={[styles.stepLabel, { fontSize: size * 0.065, color: colors.textMuted }]}>
          ADIM
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontWeight: '800',
    textAlign: 'center',
  },
  stepLabel: {
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
});
