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
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';
import * as friendsApi from '@/api/friends';
import * as stepsApi from '@/api/steps';
import type { PublicUser } from '@/types';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [weeklySteps, setWeeklySteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = id === me?.id;

  useFocusEffect(useCallback(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: user } = await apiClient.get<PublicUser>(`/users/${id}`);
        setProfile(user);

        // Check friendship
        const friends = await friendsApi.getFriends();
        const existing = friends.find((f) => f.id === id);
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

        // Weekly steps (best effort)
        if (!isMe) {
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
            // not friends yet, skip
          }
        } else {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
          const today = new Date().toISOString().split('T')[0];
          const steps = await stepsApi.getStepsRange(weekStart.toISOString().split('T')[0], today);
          setWeeklySteps(steps.reduce((s, r) => s + r.step_count, 0));
        }
      } catch {
        Alert.alert('Hata', 'Profil yüklenemedi');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isMe]));  // eslint-disable-line react-hooks/exhaustive-deps

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
          <TouchableOpacity onPress={() => router.push('/profile/edit')}>
            <Text style={styles.editBtn}>✏️ Düzenle</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView>
        {/* Avatar & info */}
        <View style={styles.profileCard}>
          <Avatar username={profile.username} avatarUrl={profile.avatar_url} size={80} />
          <Text style={styles.username}>{profile.username}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{weeklySteps.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Bu Hafta</Text>
            </View>
          </View>

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

          {isMe && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => useAuthStore.getState().logout()}
            >
              <Text style={styles.logoutText}>Çıkış Yap</Text>
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
  editBtn: { fontSize: 14, color: '#6C63FF', fontWeight: '600' },
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
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#6C63FF' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  friendAction: { width: '100%' },
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
