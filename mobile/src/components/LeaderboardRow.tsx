import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import type { LeaderboardEntry } from '../types';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

const RANK_COLORS = ['#F59E0B', '#9CA3AF', '#CD7F32'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3;
  const rankIcon = isTop3 ? RANK_ICONS[entry.rank - 1] : null;
  const rankColor = isTop3 ? RANK_COLORS[entry.rank - 1] : '#6B7280';

  return (
    <View style={[styles.row, entry.isCurrentUser && styles.highlightedRow]}>
      <View style={styles.rankContainer}>
        {rankIcon ? (
          <Text style={styles.rankIcon}>{rankIcon}</Text>
        ) : (
          <Text style={[styles.rankNumber, { color: rankColor }]}>{entry.rank}</Text>
        )}
      </View>

      <Avatar avatarId={entry.avatarId} size={38} />

      <View style={styles.info}>
        <Text style={[styles.username, entry.isCurrentUser && styles.currentUser]}>
          {entry.username}
          {entry.isCurrentUser ? ' (Sen)' : ''}
        </Text>
        <Text style={styles.steps}>{entry.stepCount.toLocaleString()} adım</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  highlightedRow: {
    backgroundColor: '#F0EEFF',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: 8,
  },
  rankIcon: {
    fontSize: 22,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  currentUser: {
    color: '#6C63FF',
  },
  steps: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
