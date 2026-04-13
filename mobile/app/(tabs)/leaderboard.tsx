import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import * as leaderboardApi from '@/api/leaderboard';
import type { LeaderboardEntry } from '@/types';

type Period = 'daily' | 'weekly';

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = period === 'daily'
      ? await leaderboardApi.getDailyLeaderboard()
      : await leaderboardApi.getWeeklyLeaderboard();
    setEntries(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [period]);

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(console.error);
    setRefreshing(false);
  }

  const periodLabel = period === 'daily' ? 'Bugün' : 'Bu Hafta';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sıralama</Text>

      {/* Period toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, period === 'daily' && styles.activeToggle]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.toggleText, period === 'daily' && styles.activeToggleText]}>
            Günlük
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, period === 'weekly' && styles.activeToggle]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.toggleText, period === 'weekly' && styles.activeToggleText]}>
            Haftalık
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{periodLabel} en çok adım</Text>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>Henüz veri yok.</Text>
            <Text style={styles.emptySubtext}>Arkadaş ekle ve adım atmaya başla!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  toggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#E8E6FF',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeToggleText: {
    color: '#6C63FF',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
