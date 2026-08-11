import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevelInfo } from '../utils/levelUtils';
import { useTheme } from '@/context/ThemeContext';

interface LevelBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
}

export function LevelBadge({ xp, size = 'md', showTitle = false }: LevelBadgeProps) {
  const info = getLevelInfo(xp);

  const dimensions = {
    sm: { badge: 22, font: 10, emoji: 12 },
    md: { badge: 28, font: 11, emoji: 14 },
    lg: { badge: 36, font: 13, emoji: 18 },
  }[size];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: dimensions.badge,
            height: dimensions.badge,
            borderRadius: dimensions.badge / 2,
            backgroundColor: info.color + '22',
            borderColor: info.color,
          },
        ]}
      >
        <Text style={{ fontSize: dimensions.emoji, lineHeight: dimensions.badge }}>
          {info.emoji}
        </Text>
      </View>
      {showTitle && (
        <View style={styles.textWrapper}>
          <Text style={[styles.levelNum, { fontSize: dimensions.font, color: info.color }]}>
            Lv.{info.level}
          </Text>
          <Text style={[styles.title, { fontSize: dimensions.font - 1, color: info.color }]}>
            {info.title}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Full XP progress bar for use in profile */
export function LevelProgressBar({ xp }: { xp: number }) {
  const { colors } = useTheme();
  const info = getLevelInfo(xp);
  const pct = info.xpNeededForNext ? info.progress * 100 : 100;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.header}>
        <View style={barStyles.left}>
          <Text style={[barStyles.emoji]}>{info.emoji}</Text>
          <View>
            <Text style={[barStyles.levelText, { color: info.color }]}>
              Lv.{info.level} — {info.title}
            </Text>
            <Text style={[barStyles.xpText, { color: colors.textMuted }]}>
              {info.xpNeededForNext
                ? `${info.xpIntoLevel} / ${info.xpNeededForNext} XP`
                : `${xp} XP — Maksimum Seviye`}
            </Text>
          </View>
        </View>
        {info.nextLevelXp && (
          <Text style={[barStyles.nextLabel, { color: colors.textMuted }]}>Sonraki: {info.nextLevelXp} XP</Text>
        )}
      </View>
      <View style={[barStyles.track, { backgroundColor: colors.cardAlt }]}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: info.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  textWrapper: { flexDirection: 'column' },
  levelNum: { fontWeight: '700', lineHeight: 14 },
  title: { lineHeight: 12 },
});

const barStyles = StyleSheet.create({
  container: { width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 24 },
  levelText: { fontSize: 14, fontWeight: '700' },
  xpText: { fontSize: 11, marginTop: 1 },
  nextLabel: { fontSize: 11 },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, minWidth: 4 },
});
