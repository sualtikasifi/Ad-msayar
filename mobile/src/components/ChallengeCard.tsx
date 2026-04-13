import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Challenge } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  active: '#10B981',
  completed: '#6C63FF',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

function getDaysLeft(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Bitti';
  if (diff === 0) return 'Bugün bitiyor';
  return `${diff} gün kaldı`;
}

export function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const statusColor = STATUS_COLORS[challenge.status] || '#9CA3AF';
  const statusLabel = STATUS_LABELS[challenge.status] || challenge.status;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {challenge.title || (challenge.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.dates}>
          {challenge.start_date} → {challenge.end_date}
        </Text>
        {challenge.status === 'active' && (
          <Text style={styles.daysLeft}>{getDaysLeft(challenge.end_date)}</Text>
        )}
      </View>

      {challenge.my_steps !== undefined && (
        <View style={styles.footer}>
          <Text style={styles.mySteps}>
            Senin adımların: <Text style={styles.stepValue}>{challenge.my_steps?.toLocaleString()}</Text>
          </Text>
          {challenge.my_rank && (
            <Text style={styles.rank}>#{challenge.my_rank}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dates: {
    fontSize: 12,
    color: '#6B7280',
  },
  daysLeft: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mySteps: {
    fontSize: 13,
    color: '#6B7280',
  },
  stepValue: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C63FF',
  },
});
