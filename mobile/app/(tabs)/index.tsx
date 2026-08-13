import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePedometer } from '@/hooks/usePedometer';
import { StepRing } from '@/components/StepRing';
import { ChallengeCard } from '@/components/ChallengeCard';
import { InlineChallengeCreator } from '@/components/InlineChallengeCreator';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
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
  const { todaySteps, isAvailable, permissionGranted, checked } = usePedometer();
  const { loadTodayFromServer } = useStepsStore();
  const { challenges, loadChallenges } = useChallengeStore();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterType>('all');

  const goal = user?.daily_step_goal ?? 10000;
  const percent = Math.min(Math.round((todaySteps / goal) * 100), 100);
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
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Pedometer permission/availability warning — otherwise steps silently
              never count and the user has no way to know why. */}
          {checked && (!isAvailable || !permissionGranted) && (
            <TouchableOpacity
              style={[styles.warningBanner, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={() => Linking.openSettings().catch(() => {})}
              activeOpacity={0.85}
            >
              <Text style={styles.warningBannerIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.warningBannerText, { color: colors.text }]}>
                  {!isAvailable
                    ? 'Bu cihazda adım sayar sensörü bulunamadı'
                    : 'Adım sayma izni verilmedi'}
                </Text>
                {isAvailable && (
                  <Text style={[styles.warningBannerCta, { color: colors.textMuted }]}>
                    {Platform.OS === 'android'
                      ? 'Adımlarının takip edilmesi için Ayarlar → İzinler → Fiziksel Aktivite\'yi aç'
                      : 'Adımlarının takip edilmesi için Ayarlar → Hareket ve Uygunluk\'u aç'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}

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

          {/* Greeting */}
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.text }]}>Merhaba, {user?.username} 👋</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>

          {/* Step Ring */}
          <View style={[styles.ringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ringContainer}>
              <StepRing steps={todaySteps} goal={goal} size={220} />
            </View>
            <View style={[styles.goalPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.goalPillText, { color: colors.textSecondary }]}>
                Hedef: {goal.toLocaleString('tr-TR')} (%{percent})
              </Text>
            </View>
          </View>

          {/* Pending invites */}
          {pendingChallenges.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFilter('pending')}
              style={styles.inviteBannerWrap}
            >
              <LinearGradient
                colors={isDark ? [colors.primaryLight, colors.cardAlt] : [colors.primary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.inviteBanner, { borderColor: colors.border }]}
              >
                <Text style={styles.inviteBannerIcon}>📬</Text>
                <Text style={styles.inviteBannerText}>
                  {pendingChallenges.length} Yeni Challenge Daveti!
                </Text>
                <Text style={styles.inviteBannerChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Challenges */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 20, marginBottom: 8 }]}>🏆 Challenge'lar</Text>

            <View style={styles.filterRow}>
              {FILTERS.map((f) => {
                const active = filter === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.filterChip,
                      { backgroundColor: active ? colors.primary : colors.cardAlt, borderColor: active ? colors.primary : colors.border },
                    ]}
                    onPress={() => setFilter(f.value)}
                  >
                    <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredChallenges.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {filter === 'all'
                    ? 'Henüz challenge yok. Aşağıdan bir tane oluştur 👇'
                    : `${FILTERS.find((f) => f.value === filter)?.label} challenge yok.`}
                </Text>
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

            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 20, marginTop: 12, marginBottom: 0 }]}>+ Yeni Challenge</Text>
            <InlineChallengeCreator onCreated={() => loadChallenges().catch(console.error)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
  },
  date: {
    fontSize: 13,
    marginTop: 2,
  },
  ringCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  ringContainer: {
    alignItems: 'center',
  },
  goalPill: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  goalPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteBannerWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inviteBannerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  inviteBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inviteBannerChevron: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  warningBannerIcon: {
    fontSize: 20,
  },
  warningBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  warningBannerCta: {
    fontSize: 12,
    marginTop: 2,
  },
  guestBanner: {
    backgroundColor: '#6C63FF',
    marginHorizontal: 16,
    marginTop: 4,
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
