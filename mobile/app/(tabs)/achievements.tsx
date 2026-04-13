import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AchievementBadge } from '@/components/AchievementBadge';
import { useAchievementStore } from '@/store/achievementStore';
import type { Achievement } from '@/api/achievements';

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

export default function AchievementsScreen() {
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
      >
        {/* Header stats */}
        <View style={styles.header}>
          <Text style={styles.title}>Rozetler</Text>
          {data && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>⚡ {data.total_xp} XP</Text>
            </View>
          )}
        </View>

        {data && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.earned_count}</Text>
              <Text style={styles.statLabel}>Kazanılan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.total_count - data.earned_count}</Text>
              <Text style={styles.statLabel}>Kalan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round((data.earned_count / data.total_count) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Tamamlandı</Text>
            </View>
          </View>
        )}

        {/* Progress bar */}
        {data && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(data.earned_count / data.total_count) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.id && styles.activeCategoryChip]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.activeCategoryLabel]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Count */}
        <Text style={styles.countText}>
          {earnedInCategory} / {filtered.length} rozet kazanıldı
        </Text>

        {/* Badge grid */}
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

      {/* Detail modal */}
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
            <View style={styles.modalCard}>
              <Text style={styles.modalEmoji}>{selectedAchievement.emoji}</Text>
              <Text style={styles.modalName}>{selectedAchievement.name}</Text>
              <Text style={styles.modalDesc}>{selectedAchievement.description}</Text>

              <View style={styles.modalMeta}>
                <View style={[styles.categoryPill, { backgroundColor: (CATEGORY_COLORS[selectedAchievement.category] || '#9CA3AF') + '22' }]}>
                  <Text style={[styles.categoryPillText, { color: CATEGORY_COLORS[selectedAchievement.category] || '#9CA3AF' }]}>
                    {CATEGORIES.find(c => c.id === selectedAchievement.category)?.emoji}{' '}
                    {CATEGORIES.find(c => c.id === selectedAchievement.category)?.label}
                  </Text>
                </View>
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>⚡ +{selectedAchievement.xp} XP</Text>
                </View>
              </View>

              {selectedAchievement.earned ? (
                <View style={styles.earnedBanner}>
                  <Text style={styles.earnedText}>
                    ✓ Kazanıldı {selectedAchievement.earned_at
                      ? new Date(selectedAchievement.earned_at).toLocaleDateString('tr-TR')
                      : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.lockedBanner}>
                  <Text style={styles.lockedText}>🔒 Henüz kazanılmadı</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  xpBadge: {
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  xpText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#6C63FF' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },
  progressContainer: { paddingHorizontal: 16, marginBottom: 16 },
  progressBg: {
    height: 6,
    backgroundColor: '#E8E6FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  activeCategoryChip: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  activeCategoryLabel: { color: '#FFFFFF' },
  countText: {
    fontSize: 12,
    color: '#9CA3AF',
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  modalEmoji: { fontSize: 56, marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  modalMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  categoryPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  categoryPillText: { fontSize: 12, fontWeight: '600' },
  xpPill: { backgroundColor: '#E8E6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  xpPillText: { fontSize: 12, fontWeight: '700', color: '#6C63FF' },
  earnedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  earnedText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  lockedBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  lockedText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
});
