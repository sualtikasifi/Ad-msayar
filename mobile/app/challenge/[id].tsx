import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { useChallengeStore } from '@/store/challengeStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socketService';
import type { ParticipantRanking } from '@/types';

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Başlamadı',
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const end = new Date(endDate + 'T23:59:59');
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Süre doldu');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) setTimeLeft(`${days}g ${hours}s kaldı`);
      else setTimeLeft(`${hours}s ${mins}d kaldı`);
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return <Text style={timerStyles.text}>⏱ {timeLeft}</Text>;
}

const timerStyles = StyleSheet.create({
  text: { fontSize: 14, color: '#6C63FF', fontWeight: '600' },
});

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeChallengeDetail, loadChallengeDetail, acceptChallenge, declineChallenge, updateDetailRankings } =
    useChallengeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    return loadChallengeDetail(id).catch(console.error);
  }, [id, loadChallengeDetail]);

  useEffect(() => {
    load();
  }, [load]);

  // Join socket room and listen for live updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    socket.emit('challenge:join', { challengeId: id });

    socket.on('challenge:leaderboard_update', ({ challengeId, rankings }: { challengeId: string; rankings: ParticipantRanking[] }) => {
      if (challengeId === id) {
        updateDetailRankings({ rankings });
      }
    });

    socket.on('challenge:completed', ({ challengeId }: { challengeId: string }) => {
      if (challengeId === id) load();
    });

    return () => {
      socket.emit('challenge:leave', { challengeId: id });
      socket.off('challenge:leaderboard_update');
      socket.off('challenge:completed');
    };
  }, [id, load, updateDetailRankings]);

  // Poll fallback every 30s when socket might be unavailable
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeChallengeDetail?.status === 'active') load();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeChallengeDetail?.status, load]);

  async function handleAccept() {
    setActionLoading(true);
    try {
      await acceptChallenge(id);
      await load();
    } catch {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    Alert.alert('Reddet', 'Challenge davetini reddetmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await declineChallenge(id);
            router.back();
          } catch {
            Alert.alert('Hata', 'İşlem başarısız');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!activeChallengeDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  const challenge = activeChallengeDetail;
  const myStatus = challenge.rankings.find((r) => r.userId === user?.id) ? 'accepted' : undefined;
  const isInvited = challenge.my_status === 'invited';
  const isActive = challenge.status === 'active';
  const isCompleted = challenge.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {challenge.title || (challenge.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Challenge info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.statusBadge}>{STATUS_LABELS[challenge.status] || challenge.status}</Text>
          <Text style={styles.typeBadge}>{challenge.type === '1v1' ? '⚔️ 1v1' : '👥 Grup'}</Text>
        </View>
        <Text style={styles.dates}>{challenge.start_date} → {challenge.end_date}</Text>
        {isActive && <CountdownTimer endDate={challenge.end_date} />}
        {isCompleted && challenge.rankings[0] && (
          <Text style={styles.winner}>🏆 Kazanan: {challenge.rankings[0].username}</Text>
        )}
      </View>

      {/* Invite actions */}
      {isInvited && (
        <View style={styles.inviteActions}>
          <Text style={styles.inviteText}>Bu challenge'a davet edildiniz!</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, actionLoading && styles.disabled]}
              onPress={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.acceptText}>✓ Katıl</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, actionLoading && styles.disabled]}
              onPress={handleDecline}
              disabled={actionLoading}
            >
              <Text style={styles.declineText}>✕ Reddet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rankings */}
      <Text style={styles.rankingsTitle}>
        {isActive ? '🔴 Canlı Sıralama' : 'Sıralama'}
      </Text>

      <FlatList
        data={challenge.rankings}
        keyExtractor={(item) => item.userId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
        renderItem={({ item, index }) => {
          const isMe = item.userId === user?.id;
          const rankIcon = index < 3 ? RANK_ICONS[index] : null;

          return (
            <View style={[styles.rankRow, isMe && styles.myRow]}>
              <Text style={styles.rankIcon}>{rankIcon ?? `${item.rank}`}</Text>
              <Avatar username={item.username} avatarUrl={item.avatarUrl} size={42} />
              <View style={styles.rankInfo}>
                <Text style={[styles.rankUsername, isMe && styles.meText]}>
                  {item.username}{isMe ? ' (Sen)' : ''}
                </Text>
                <Text style={styles.rankSteps}>{item.totalSteps.toLocaleString()} toplam adım</Text>
                {isActive && (
                  <Text style={styles.todaySteps}>Bugün: {item.stepsToday.toLocaleString()} adım</Text>
                )}
              </View>
              {index === 0 && isCompleted && <Text style={styles.winnerBadge}>🏆</Text>}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz kabul eden yok</Text>
          </View>
        }
      />
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
  navTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', flex: 1, textAlign: 'center' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statusBadge: {
    backgroundColor: '#E8E6FF',
    color: '#6C63FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  dates: { fontSize: 13, color: '#6B7280' },
  winner: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  inviteActions: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inviteText: { fontSize: 15, fontWeight: '600', color: '#92400E', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  acceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  declineText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
  rankingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  myRow: { backgroundColor: '#F0EEFF' },
  rankIcon: { width: 36, fontSize: 22, textAlign: 'center' },
  rankInfo: { flex: 1, marginLeft: 10 },
  rankUsername: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  meText: { color: '#6C63FF' },
  rankSteps: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  todaySteps: { fontSize: 12, color: '#10B981', marginTop: 1 },
  winnerBadge: { fontSize: 24 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
