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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { todaySteps } = usePedometer();
  const { loadTodayFromServer } = useStepsStore();
  const { challenges, loadChallenges } = useChallengeStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const pendingChallenges = challenges.filter((c) => c.status === 'pending' && c.my_status === 'invited');

  useEffect(() => {
    loadChallenges().catch(console.error);
    loadTodayFromServer().catch(console.error);
  }, [loadChallenges, loadTodayFromServer]);

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
          <StepRing steps={todaySteps} goal={10000} size={220} />
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

        {/* Active challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Aktif Challenge'lar</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/challenges')}>
              <Text style={styles.seeAll}>Tümü</Text>
            </TouchableOpacity>
          </View>

          {activeChallenges.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aktif challenge yok.</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/challenge/new')}
              >
                <Text style={styles.createButtonText}>Challenge Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeChallenges.slice(0, 3).map((c) => (
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
  seeAll: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
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
