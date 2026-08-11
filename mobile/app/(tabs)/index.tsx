import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePedometer } from '@/hooks/usePedometer';
import { StepRing } from '@/components/StepRing';
import { ChallengeCard } from '@/components/ChallengeCard';
import { useAuthStore } from '@/store/authStore';
import { useChallengeStore } from '@/store/challengeStore';
import { useStepsStore } from '@/store/stepsStore';
import { useTheme } from '@/context/ThemeContext';
import type { ChallengeStatus } from '@/types';

type FilterType = 'all' | ChallengeStatus;

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Bekliyor', value: 'pending' },
  { label: 'Bitti', value: 'completed' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { todaySteps, debugInfo } = usePedometer();
  const { loadTodayFromServer } = useStepsStore();
  const { challenges, loadChallenges } = useChallengeStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterType>('all');

  const pendingChallenges = challenges.filter((c) => c.status === 'pending' && c.my_status === 'invited');
  const filteredChallenges = filter === 'all' ? challenges : challenges.filter((c) => c.status === filter);

  useEffect(() => {
    loadChallenges().catch(console.error);
  }, [loadChallenges]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadChallenges(), loadTodayFromServer()]).catch(console.error);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Guest banner */}
        {user?.is_guest && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/profile/claim')}
            activeOpacity={0.85}
          >
            <Text style={styles.guestBannerText}>
              👤 Misafir olarak kullanıyorsun
            </Text>
            <Text style={styles.guestBannerCta}>Hesap oluştur → Verilerini koru</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Merhaba, {user?.username} 👋</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>

        {/* Step Ring */}
        <View style={styles.ringContainer}>
          <StepRing steps={todaySteps} goal={user?.daily_step_goal ?? 10000} size={220} />
        </View>

        {/* Temporary pedometer diagnostics — remove once step tracking is confirmed working */}
        <View style={styles.debugBox}>
          <Text style={styles.debugText}>
            🔧 sensör: {String(debugInfo.available)} · izin: {debugInfo.permission} · olay: {debugInfo.watchEventCount} · ham: {debugInfo.lastRawSteps ?? '—'}
          </Text>
          {debugInfo.lastError && (
            <Text style={styles.debugError}>hata: {debugInfo.lastError}</Text>
          )}
        </View>

        {/* Pending invites */}
        {pendingChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📨 Davetler ({pendingChallenges.length})</Text>
            {pendingChallenges.slice(0, 2).map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onPress={() => router.push(`/challenge/${c.id}`)}
              />
            ))}
          </View>
        )}

        {/* Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Challenge'lar</Text>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => router.push('/challenge/new')}
            >
              <Text style={styles.newButtonText}>+ Yeni</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, filter === f.value && styles.activeChip]}
                onPress={() => setFilter(f.value)}
              >
                <Text style={[styles.filterText, filter === f.value && styles.activeFilterText]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredChallenges.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Henüz challenge yok.'
                  : `${FILTERS.find((f) => f.value === filter)?.label} challenge yok.`}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/challenge/new')}
              >
                <Text style={styles.createButtonText}>Challenge Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredChallenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onPress={() => router.push(`/challenge/${c.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  date: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  ringContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  debugBox: {
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  debugText: {
    color: '#A5F3FC',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  debugError: {
    color: '#FCA5A5',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  newButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  activeChip: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  guestBanner: {
    backgroundColor: '#6C63FF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  guestBannerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  guestBannerCta: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
