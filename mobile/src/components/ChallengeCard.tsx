import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Challenge } from '../types';
import { useTheme } from '@/context/ThemeContext';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

function getDaysLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Bitti';
  if (diff === 0) return 'Bugün bitiyor';
  return `${diff} gün kaldı`;
}

function getTimeProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(Math.max((now - start) / (end - start), 0), 1);
}

export function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const { colors } = useTheme();
  const isLeader = challenge.status === 'active' && challenge.my_rank === 1;
  const isWinner = challenge.status === 'completed' && challenge.my_rank === 1;

  let statusLabel = 'Bekliyor';
  let statusColor = colors.warning;
  if (challenge.status === 'active') {
    statusLabel = isLeader ? 'Lider: Sen' : 'Devam Ediyor';
    statusColor = isLeader ? colors.primary : colors.accent;
  } else if (challenge.status === 'completed') {
    statusLabel = isWinner ? 'Kazandın!' : 'Tamamlandı';
    statusColor = isWinner ? colors.success : colors.textMuted;
  } else if (challenge.status === 'cancelled') {
    statusLabel = 'İptal';
    statusColor = colors.danger;
  }

  const hasGoalProgress = challenge.status === 'active' && !!challenge.step_goal;
  const progress = hasGoalProgress
    ? Math.min((challenge.my_steps ?? 0) / (challenge.step_goal as number), 1)
    : getTimeProgress(challenge.start_date, challenge.end_date);
  const progressLabel = hasGoalProgress
    ? `%${Math.round(progress * 100)}`
    : challenge.my_steps !== undefined
      ? `${challenge.my_steps.toLocaleString('tr-TR')} adım`
      : getDaysLeft(challenge.end_date);

  const icon = challenge.type === '1v1' ? '⚔️' : '👥';
  const iconBg = challenge.type === '1v1' ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {challenge.title || (challenge.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {challenge.type === '1v1' ? '1v1' : 'Grup'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '26' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {challenge.status === 'active' && (
        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>İlerleme</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>{progressLabel}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.max(progress * 100, 4)}%` }]}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 110,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBlock: {
    marginTop: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
