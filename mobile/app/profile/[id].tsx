import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { AchievementBadge } from '@/components/AchievementBadge';
import { LevelProgressBar } from '@/components/LevelBadge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAuthStore } from '@/store/authStore';
import { useTheme, ThemeColors } from '@/context/ThemeContext';
import { apiClient } from '@/api/client';
import * as friendsApi from '@/api/friends';
import * as stepsApi from '@/api/steps';
import * as statsApi from '@/api/stats';
import * as achievementsApi from '@/api/achievements';
import * as challengesApi from '@/api/challenges';
import type { PublicUser } from '@/types';
import type { PersonalRecords } from '@/api/stats';
import type { AchievementsResponse } from '@/api/achievements';
import { today as todayLocalDate, weekStart as weekStartLocalDate } from '@/utils/dateHelpers';

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, marginTop: 2, textAlign: 'center' },
});

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [weeklySteps, setWeeklySteps] = useState(0);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [challengeWins, setChallengeWins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = id === me?.id;

  useFocusEffect(useCallback(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: user } = await apiClient.get<PublicUser>(`/users/${id}`);
        setProfile(user);

        if (isMe) {
          // Load rich stats for own profile
          const [recs, ach, challenges] = await Promise.all([
            statsApi.getPersonalRecords(),
            achievementsApi.getMyAchievements(),
            challengesApi.getMyChallenges(),
          ]);
          setRecords(recs);
          setAchievements(ach);
          const wins = challenges.filter(
            (c) => c.status === 'completed' && c.my_rank === 1
          ).length;
          setChallengeWins(wins);
        } else {
          // Load public stats for other users
          const [ach, friendsList] = await Promise.all([
            achievementsApi.getUserAchievements(id),
            friendsApi.getFriends(),
          ]);
          setAchievements(ach);

          const existing = friendsList.find((f) => f.id === id);
          if (existing) {
            setIsFriend(true);
          } else {
            const sent = await friendsApi.getSentRequests();
            const pending = sent.find((r) => r.to_user?.id === id);
            if (pending) {
              setRequestSent(true);
              setFriendshipId(pending.id);
            }
          }

          // Weekly steps (only for friends)
          try {
            const { data: steps } = await apiClient.get(`/steps/user/${id}`, {
              params: { from: weekStartLocalDate(), to: todayLocalDate() },
            });
            const total = (steps as { step_count: number }[]).reduce((s, r) => s + r.step_count, 0);
            setWeeklySteps(total);
          } catch {
            // not friends yet or API error
          }
        }
      } catch {
        Alert.alert('Hata', 'Profil yüklenemedi');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isMe])); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddFriend() {
    if (!profile) return;
    setActionLoading(true);
    try {
      await friendsApi.sendFriendRequest(profile.id);
      setRequestSent(true);
      Alert.alert('Gönderildi', 'Arkadaşlık isteği gönderildi');
    } catch {
      Alert.alert('Hata', 'İstek gönderilemedi');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (!profile) return null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Profil</Text>
          {isMe ? (
            <View style={styles.navRight}>
              <TouchableOpacity
                onPress={() => router.push('/profile/settings')}
                style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}
                accessibilityLabel="Ayarlar"
                accessibilityRole="button"
              >
                <Text style={styles.iconBtnText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/profile/edit')}
                style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}
                accessibilityLabel="Profili düzenle"
                accessibilityRole="button"
              >
                <Text style={styles.iconBtnText}>✏️</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar & info */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Avatar avatarId={profile.avatar_id} size={80} />
            <Text style={[styles.username, { color: colors.text }]}>{profile.username}</Text>
            {isMe && me?.is_guest && (
              <View style={[styles.guestBadge, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.guestBadgeText, { color: colors.textMuted }]}>👤 Misafir Hesap</Text>
              </View>
            )}
            {achievements && achievements.total_xp >= 0 && (
              <View style={{ width: '100%', marginTop: 8 }}>
                <LevelProgressBar xp={achievements.total_xp} />
              </View>
            )}

            {/* Stats row */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {isMe && records ? (
              <View style={styles.statsGrid}>
                <StatBox
                  value={records.total_steps_all_time >= 1000
                    ? `${(records.total_steps_all_time / 1000).toFixed(1)}B`
                    : records.total_steps_all_time.toLocaleString('tr-TR')}
                  label="Toplam Adım"
                  color={colors.primary}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatBox
                  value={`${records.current_streak}g`}
                  label="Mevcut Seri"
                  color={colors.danger}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatBox
                  value={String(challengeWins)}
                  label="Challenge Kazandı"
                  color={colors.warning}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatBox
                  value={String(achievements?.earned_count ?? 0)}
                  label="Rozet"
                  color={colors.success}
                />
              </View>
            ) : (
              <View style={styles.statsGrid}>
                <StatBox
                  value={weeklySteps.toLocaleString('tr-TR')}
                  label="Bu Hafta"
                  color={colors.primary}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatBox
                  value={String(achievements?.earned_count ?? 0)}
                  label="Rozet"
                  color={colors.success}
                />
              </View>
            )}

            {/* Recently earned achievements */}
            {achievements && achievements.recently_earned.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Son Kazanılan Rozetler</Text>
                <View style={styles.badgeRow}>
                  {achievements.recently_earned.slice(0, 5).map((a) => (
                    <AchievementBadge key={a.id} achievement={a} size="sm" />
                  ))}
                </View>
              </>
            )}

            {/* Friend action */}
            {!isMe && (
              <View style={styles.friendAction}>
                {isFriend ? (
                  <View style={[styles.friendBadge, { backgroundColor: 'rgba(16,185,129,0.16)' }]}>
                    <Text style={[styles.friendBadgeText, { color: colors.success }]}>✓ Arkadaş</Text>
                  </View>
                ) : requestSent ? (
                  <View style={[styles.pendingBadge, { backgroundColor: 'rgba(245,158,11,0.16)' }]}>
                    <Text style={[styles.pendingText, { color: colors.warning }]}>⏳ İstek gönderildi</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }, actionLoading && styles.disabled]}
                    onPress={handleAddFriend}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.addBtnText}>+ Arkadaş Ekle</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isMe && me?.is_guest && (
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/profile/claim')}
              >
                <Text style={styles.claimText}>🔓 Hesabını Oluştur</Text>
              </TouchableOpacity>
            )}

            {isMe && (
              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: 'rgba(239,68,68,0.14)' }]}
                onPress={() => useAuthStore.getState().logout()}
              >
                <Text style={[styles.logoutText, { color: colors.danger }]}>
                  {me?.is_guest ? 'Misafir Oturumunu Kapat' : 'Çıkış Yap'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: { fontSize: 15, fontWeight: '600' },
  navTitle: { fontSize: 17, fontWeight: '700' },
  navRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 15 },
  profileCard: {
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  statDivider: { width: 1, height: 32 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  friendAction: { width: '100%', marginTop: 4 },
  friendBadge: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  friendBadgeText: { fontWeight: '600' },
  pendingBadge: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  pendingText: { fontWeight: '600' },
  addBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  guestBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  guestBadgeText: { fontSize: 13, fontWeight: '600' },
  claimBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  claimText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  logoutText: { fontWeight: '700', fontSize: 15 },
});
