import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import type { LeaderboardEntry } from '../types';
import { useTheme, MEDAL_COLORS } from '@/context/ThemeContext';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [MEDAL_COLORS.gold, MEDAL_COLORS.silver, MEDAL_COLORS.bronze];

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const { colors } = useTheme();
  const isTop3 = entry.rank <= 3;
  const rankIcon = isTop3 ? RANK_ICONS[entry.rank - 1] : null;
  const rankColor = isTop3 ? RANK_COLORS[entry.rank - 1] : colors.textMuted;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: entry.isCurrentUser ? colors.primary : colors.border },
      ]}
    >
      {entry.isCurrentUser && (
        <View style={[styles.senBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.senBadgeText}>SEN</Text>
        </View>
      )}

      <View style={[styles.rankCircle, { backgroundColor: colors.cardAlt }]}>
        {rankIcon ? (
          <Text style={styles.rankIcon}>{rankIcon}</Text>
        ) : (
          <Text style={[styles.rankNumber, { color: rankColor }]}>{entry.rank}</Text>
        )}
      </View>

      <Avatar avatarId={entry.avatarId} size={38} />

      <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
        {entry.username}
      </Text>

      <Text style={[styles.steps, { color: colors.text }]}>{entry.stepCount.toLocaleString('tr-TR')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  senBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  senBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankIcon: {
    fontSize: 16,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    marginRight: 8,
  },
  steps: {
    fontSize: 15,
    fontWeight: '800',
  },
});
