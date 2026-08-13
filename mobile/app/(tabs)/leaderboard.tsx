import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { AchievementBadge } from '@/components/AchievementBadge';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAchievementStore } from '@/store/achievementStore';
import { useTheme, ThemeColors } from '@/context/ThemeContext';
import * as leaderboardApi from '@/api/leaderboard';
import type { LeaderboardEntry } from '@/types';
import type { Achievement } from '@/api/achievements';

type ViewMode = 'leaderboard' | 'achievements';
type Period = 'daily' | 'weekly';

const CATEGORIES = [
  { id: 'all',       label: 'Tümü',       emoji: '🏅' },
  { id: 'steps',     label: 'Adım',       emoji: '👟' },
  { id: 'streak',    label: 'Seri',        emoji: '🔥' },
  { id: 'social',    label: 'Sosyal',     emoji: '🤝' },
  { id: 'challenge', label: 'Challenge',  emoji: '🏆' },
];

const CATEGORY_COLORS: Record<string, string> = {
  steps:     '#6C63FF',
  streak:    '#EF4444',
  social:    '#10B981',
  challenge: '#F59E0B',
};

export default function LeaderboardAndAchievementsScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState<ViewMode>('leaderboard');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <AppHeader />

        <View style={[styles.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === 'leaderboard' && { backgroundColor: colors.primary }]}
            onPress={() => setView('leaderboard')}
          >
            <Text style={[styles.viewToggleText, { color: view === 'leaderboard' ? '#FFFFFF' : colors.textMuted }]}>
              📊 SIRALAMA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === 'achievements' && { backgroundColor: colors.primary }]}
            onPress={() => setView('achievements')}
          >
            <Text style={[styles.viewToggleText, { color: view === 'achievements' ? '#FFFFFF' : colors.textMuted }]}>
              🏅 ROZETLER
            </Text>
          </TouchableOpacity>
        </View>

        {view === 'leaderboard' ? <LeaderboardSection colors={colors} /> : <AchievementsSection colors={colors} />}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function LeaderboardSection({ colors }: { colors: ThemeColors }) {
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

  return (
    <>
      <View style={styles.periodRow}>
        {([
          { key: 'daily' as Period, label: 'GÜNLÜK' },
          { key: 'weekly' as Period, label: 'HAFTALIK' },
        ]).map((p) => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodBtn,
                { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
              ]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodText, { color: active ? '#FFFFFF' : colors.textMuted }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz veri yok.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Arkadaş ekle ve adım atmaya başla!</Text>
          </View>
        }
      />
    </>
  );
}

function AchievementsSection({ colors }: { colors: ThemeColors }) {
  const { data, isLoading, loadAchievements } = useAchievementStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAchievements().catch(console.error);
  }, [loadAchievements]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAchievements().catch(console.error);
    setRefreshing(false);
  }

  const filtered = data?.all.filter(
    (a) => activeCategory === 'all' || a.category === activeCategory
  ) ?? [];

  const earnedInCategory = filtered.filter((a) => a.earned).length;

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {data && (
          <View style={styles.xpBadgeRow}>
            <View style={[styles.xpBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.xpText}>⚡ {data.total_xp} XP</Text>
            </View>
          </View>
        )}

        {data && (
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{data.earned_count}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Kazanılan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{data.total_count - data.earned_count}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Kalan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {Math.round((data.earned_count / data.total_count) * 100)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tamamlandı</Text>
            </View>
          </View>
        )}

        {data && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: colors.cardAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(data.earned_count / data.total_count) * 100}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {earnedInCategory} / {filtered.length} rozet kazanıldı
        </Text>

        <View style={styles.grid}>
          {filtered.map((achievement) => (
            <View key={achievement.id} style={styles.gridItem}>
              <AchievementBadge
                achievement={achievement}
                size="md"
                onPress={() => setSelectedAchievement(achievement)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          {selectedAchievement && (
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={styles.modalEmoji}>{selectedAchievement.emoji}</Text>
              <Text style={[styles.modalName, { color: colors.text }]}>{selectedAchievement.name}</Text>
              <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{selectedAchievement.description}</Text>

              <View style={styles.modalMeta}>
                <View style={[styles.categoryPill, { backgroundColor: (CATEGORY_COLORS[selectedAchievement.category] || '#9CA3AF') + '22' }]}>
                  <Text style={[styles.categoryPillText, { color: CATEGORY_COLORS[selectedAchievement.category] || '#9CA3AF' }]}>
                    {CATEGORIES.find(c => c.id === selectedAchievement.category)?.emoji}{' '}
                    {CATEGORIES.find(c => c.id === selectedAchievement.category)?.label}
                  </Text>
                </View>
                <View style={[styles.xpPill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.xpPillText, { color: colors.primary }]}>⚡ +{selectedAchievement.xp} XP</Text>
                </View>
              </View>

              {selectedAchievement.earned ? (
                <View style={[styles.earnedBanner, { backgroundColor: colors.success + '22' }]}>
                  <Text style={[styles.earnedText, { color: colors.success }]}>
                    ✓ Kazanıldı {selectedAchievement.earned_at
                      ? new Date(selectedAchievement.earned_at).toLocaleDateString('tr-TR')
                      : ''}
                  </Text>
                </View>
              ) : (
                <View style={[styles.lockedBanner, { backgroundColor: colors.cardAlt }]}>
                  <Text style={[styles.lockedText, { color: colors.textMuted }]}>🔒 Henüz kazanılmadı</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  xpBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  xpBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  xpText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1 },
  progressContainer: { paddingHorizontal: 16, marginBottom: 16 },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  countText: {
    fontSize: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridItem: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  modalEmoji: { fontSize: 56, marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  modalMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  categoryPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  categoryPillText: { fontSize: 12, fontWeight: '600' },
  xpPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  xpPillText: { fontSize: 12, fontWeight: '700' },
  earnedBanner: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  earnedText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  lockedBanner: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  lockedText: { fontWeight: '600', fontSize: 14 },
});
