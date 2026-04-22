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
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import * as friendsApi from '@/api/friends';
import * as stepsApi from '@/api/steps';
import * as statsApi from '@/api/stats';
import * as achievementsApi from '@/api/achievements';
import * as challengesApi from '@/api/challenges';
import type { PublicUser } from '@/types';
import type { PersonalRecords } from '@/api/stats';
import type { AchievementsResponse } from '@/api/achievements';

function StatBox({ value, label, color = '#6C63FF' }: { value: string; label: string; color?: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
});

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            const today = new Date().toISOString().split('T')[0];
            const from = weekStart.toISOString().split('T')[0];
            const { data: steps } = await apiClient.get(`/steps/user/${id}`, {
              params: { from, to: today },
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profil</Text>
        {isMe ? (
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => router.push('/profile/settings')}>
              <Text style={styles.settingsBtn}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile/edit')}>
              <Text style={styles.editBtn}>✏️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & info */}
        <View style={styles.profileCard}>
          <Avatar username={profile.username} avatarUrl={profile.avatar_url} size={80} />
          <Text style={styles.username}>{profile.username}</Text>
          {isMe && me?.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>👤 Misafir Hesap</Text>
            </View>
          )}
          {achievements && achievements.total_xp >= 0 && (
            <View style={{ width: '100%', marginTop: 8 }}>
              <LevelProgressBar xp={achievements.total_xp} />
            </View>
          )}

          {/* Stats row */}
          <View style={styles.divider} />
          {isMe && records ? (
            <View style={styles.statsGrid}>
              <StatBox
                value={records.total_steps_all_time >= 1000
                  ? `${(records.total_steps_all_time / 1000).toFixed(1)}B`
                  : records.total_steps_all_time.toLocaleString()}
                label="Toplam Adım"
                color="#6C63FF"
              />
              <View style={styles.statDivider} />
              <StatBox
                value={`${records.current_streak}g`}
                label="Mevcut Seri"
                color="#EF4444"
              />
              <View style={styles.statDivider} />
              <StatBox
                value={String(challengeWins)}
                label="Challenge Kazandı"
                color="#F59E0B"
              />
              <View style={styles.statDivider} />
              <StatBox
                value={String(achievements?.earned_count ?? 0)}
                label="Rozet"
                color="#10B981"
              />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatBox
                value={weeklySteps.toLocaleString()}
                label="Bu Hafta"
                color="#6C63FF"
              />
              <View style={styles.statDivider} />
              <StatBox
                value={String(achievements?.earned_count ?? 0)}
                label="Rozet"
                color="#10B981"
              />
            </View>
          )}

          {/* Recently earned achievements */}
          {achievements && achievements.recently_earned.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Son Kazanılan Rozetler</Text>
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
                <View style={styles.friendBadge}>
                  <Text style={styles.friendBadgeText}>✓ Arkadaş</Text>
                </View>
              ) : requestSent ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>⏳ İstek gönderildi</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, actionLoading && styles.disabled]}
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
              style={styles.claimBtn}
              onPress={() => router.push('/profile/claim')}
            >
              <Text style={styles.claimText}>🔓 Hesabını Oluştur</Text>
            </TouchableOpacity>
          )}

          {isMe && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => useAuthStore.getState().logout()}
            >
              <Text style={styles.logoutText}>
                {me?.is_guest ? 'Misafir Oturumunu Kapat' : 'Çıkış Yap'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  back: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  navRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  settingsBtn: { fontSize: 18 },
  editBtn: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 14,
    marginBottom: 6,
  },
  xpBadge: {
    backgroundColor: '#E8E6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  xpText: { color: '#6C63FF', fontWeight: '700', fontSize: 12 },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  statDivider: { width: 1, height: 32, backgroundColor: '#F3F4F6' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
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
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  friendBadgeText: { color: '#059669', fontWeight: '600' },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  pendingText: { color: '#D97706', fontWeight: '600' },
  addBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  guestBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  guestBadgeText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  claimBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  claimText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
