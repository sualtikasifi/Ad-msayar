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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/Avatar';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useChallengeStore } from '@/store/challengeStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socketService';
import * as challengesApi from '@/api/challenges';
import type { ParticipantRanking } from '@/types';
import { LevelBadge } from '@/components/LevelBadge';
import { useTheme, ThemeColors } from '@/context/ThemeContext';

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Başlamadı',
  active: 'Aktif',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};
const MODE_LABELS: Record<string, string> = {
  standard: '🏆 Standart',
  duel: '⚔️ Düello',
  race: '🎯 Hedef Yarışı',
};

// Timer based on end_date (standard/race) or started_at + 24h (duel)
function useCountdown(endDate: string, startedAt: string | null, isDuel: boolean): string {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      let end: Date;
      if (isDuel && startedAt) {
        end = new Date(new Date(startedAt).getTime() + 24 * 60 * 60 * 1000);
      } else {
        end = new Date(endDate + 'T23:59:59');
      }
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
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [endDate, startedAt, isDuel]);

  return timeLeft;
}

function CountdownPill({ endDate, startedAt, isDuel, colors }: { endDate: string; startedAt: string | null; isDuel: boolean; colors: ThemeColors }) {
  const timeLeft = useCountdown(endDate, startedAt, isDuel);
  return (
    <View style={styles.countdownBlock}>
      <Text style={[styles.countdownLabel, { color: colors.textMuted }]}>KALAN SÜRE</Text>
      <View style={[styles.countdownPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.countdownText, { color: colors.text }]}>⏱ {timeLeft}</Text>
      </View>
    </View>
  );
}

// Race progress bar
function RaceProgressBar({ steps, goal, colors }: { steps: number; goal: number; colors: ThemeColors }) {
  const pct = Math.min(steps / goal, 1);
  return (
    <View style={[raceStyles.track, { backgroundColor: colors.cardAlt }]}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[raceStyles.fill, { width: `${Math.round(pct * 100)}%` as `${number}%` }]}
      />
      <Text style={[raceStyles.label, { color: colors.text }]}>{steps.toLocaleString('tr-TR')} / {goal.toLocaleString('tr-TR')}</Text>
    </View>
  );
}

const raceStyles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: 7,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
    minWidth: 4,
  },
  label: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
});

// Head-to-head "VS" card for 1v1 challenges with exactly two participants.
function DuelHeadToHead({
  rankings,
  myUserId,
  colors,
}: {
  rankings: ParticipantRanking[];
  myUserId: string | undefined;
  colors: ThemeColors;
}) {
  const me = rankings.find((r) => r.userId === myUserId) ?? rankings[0];
  const opponent = rankings.find((r) => r.userId !== me.userId) ?? rankings[1];
  const lead = me.totalSteps - opponent.totalSteps;
  const total = me.totalSteps + opponent.totalSteps;
  const myShare = total > 0 ? me.totalSteps / total : 0.5;

  return (
    <View style={[duelStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={duelStyles.row}>
        <View style={duelStyles.side}>
          <View style={[duelStyles.avatarRing, { borderColor: colors.primary }]}>
            <Avatar avatarId={me.avatarId} size={64} />
            {me.rank === 1 && (
              <View style={[duelStyles.rankBadge, { backgroundColor: colors.primary }]}>
                <Text style={duelStyles.rankBadgeText}>1.</Text>
              </View>
            )}
          </View>
          <Text style={[duelStyles.name, { color: colors.text }]} numberOfLines={1}>Sen</Text>
          <Text style={[duelStyles.steps, { color: colors.text }]}>{me.totalSteps.toLocaleString('tr-TR')}</Text>
        </View>

        <View style={[duelStyles.vsCircle, { backgroundColor: colors.cardAlt }]}>
          <Text style={[duelStyles.vsText, { color: colors.textMuted }]}>VS</Text>
        </View>

        <View style={duelStyles.side}>
          <Avatar avatarId={opponent.avatarId} size={64} />
          <Text style={[duelStyles.name, { color: colors.text }]} numberOfLines={1}>{opponent.username}</Text>
          <Text style={[duelStyles.steps, { color: colors.text }]}>{opponent.totalSteps.toLocaleString('tr-TR')}</Text>
        </View>
      </View>

      {lead !== 0 && (
        <View style={[duelStyles.leadPill, { backgroundColor: colors.accent + '22' }]}>
          <Text style={[duelStyles.leadText, { color: colors.accent }]}>
            {lead > 0 ? '📈' : '📉'} {Math.abs(lead).toLocaleString('tr-TR')} adım {lead > 0 ? 'öndesin' : 'geridesin'}
          </Text>
        </View>
      )}

      <View style={[duelStyles.track, { backgroundColor: colors.cardAlt }]}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[duelStyles.fill, { width: `${Math.max(myShare * 100, 4)}%` }]}
        />
      </View>
    </View>
  );
}

const duelStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    flex: 1,
    alignItems: 'center',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 36,
    padding: 2,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { fontSize: 12, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  steps: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  leadPill: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  leadText: { fontSize: 13, fontWeight: '700' },
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { activeChallengeDetail, loadChallengeDetail, acceptChallenge, declineChallenge, updateDetailRankings } =
    useChallengeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

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

  async function handleShareInvite() {
    setShareLoading(true);
    try {
      const { token } = await challengesApi.createInviteLink(id);
      const title = challenge?.title || (challenge?.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge');
      const deepLink = `admsayar://challenge/invite/${token}`;
      await Share.share({
        message: `Adımsayar'da seni "${title}" challenge'ına davet ediyorum! 🏆\n\nKatılmak için: ${deepLink}`,
        title: 'Challenge Daveti',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg !== 'The user did not share') {
        Alert.alert('Hata', 'Davet linki oluşturulamadı');
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handleClaimPenalty() {
    Alert.alert('Cezayı Onayla', 'Cezanı aldığını onaylıyor musun?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet, aldım!',
        onPress: async () => {
          setClaimLoading(true);
          try {
            await challengesApi.claimPenalty(id);
            await load();
          } catch {
            Alert.alert('Hata', 'İşlem başarısız');
          } finally {
            setClaimLoading(false);
          }
        },
      },
    ]);
  }

  if (!activeChallengeDetail) {
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

  const challenge = activeChallengeDetail;
  const isInvited = challenge.my_status === 'invited';
  const isActive = challenge.status === 'active';
  const isCompleted = challenge.status === 'completed';
  const isCreator = challenge.creator_id === user?.id;
  const canShare = isCreator && !isCompleted && challenge.status !== 'cancelled';
  const isDuel = challenge.mode === 'duel';
  const isRace = challenge.mode === 'race';
  const showDuelCard = challenge.type === '1v1' && challenge.rankings.length === 2 && !isInvited;

  // Penalty logic: user is a loser if challenge completed, user is in rankings at rank > 1
  const myRanking = challenge.rankings.find((r) => r.userId === user?.id);
  const isLoser = isCompleted && myRanking !== undefined && myRanking.rank > 1;
  const hasPenalty = Boolean(challenge.penalty_text);
  const penaltyClaimed = myRanking?.penaltyClaimed ?? false;
  const showPenaltySection = hasPenalty && isLoser;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
            {challenge.title || (challenge.type === '1v1' ? '1v1 Düello' : 'Grup Challenge')}
          </Text>
          {canShare ? (
            <TouchableOpacity onPress={() => void handleShareInvite()} disabled={shareLoading} style={[styles.shareBtnWrap, { backgroundColor: colors.cardAlt }]}>
              {shareLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.shareBtn}>👤➕</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <FlatList
          data={showDuelCard ? [] : challenge.rankings}
          keyExtractor={(item) => item.userId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              {isActive && (
                <CountdownPill endDate={challenge.end_date} startedAt={challenge.started_at} isDuel={isDuel} colors={colors} />
              )}

              {showDuelCard && (
                <DuelHeadToHead rankings={challenge.rankings} myUserId={user?.id} colors={colors} />
              )}

              {/* Challenge info card */}
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.badge, { backgroundColor: colors.primaryLight, color: colors.primary }]}>{STATUS_LABELS[challenge.status] || challenge.status}</Text>
                  <Text style={[styles.badge, { backgroundColor: colors.cardAlt, color: colors.textSecondary }]}>{challenge.type === '1v1' ? '⚔️ 1v1' : '👥 Grup'}</Text>
                  <Text style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.18)', color: colors.warning }]}>{MODE_LABELS[challenge.mode] || challenge.mode}</Text>
                </View>
                {!isDuel && (
                  <Text style={[styles.dates, { color: colors.textMuted }]}>{challenge.start_date} → {challenge.end_date}</Text>
                )}
                {isDuel && challenge.started_at && (
                  <Text style={[styles.dates, { color: colors.textMuted }]}>Başladı: {new Date(challenge.started_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                )}
                {isRace && challenge.step_goal && (
                  <Text style={[styles.raceGoal, { color: colors.primary }]}>🎯 Hedef: {challenge.step_goal.toLocaleString('tr-TR')} adım</Text>
                )}
                {isCompleted && challenge.rankings[0] && (
                  <Text style={[styles.winner, { color: colors.warning }]}>🏆 Kazanan: {challenge.rankings[0].username}</Text>
                )}
              </View>

              {/* Penalty section — shown to losers after completion */}
              {showPenaltySection && (
                <View
                  style={[
                    styles.penaltyCard,
                    { backgroundColor: colors.card, borderLeftColor: penaltyClaimed ? colors.success : colors.danger },
                  ]}
                >
                  <Text style={styles.penaltyEmoji}>{penaltyClaimed ? '✅' : '😅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.penaltyTitle, { color: colors.text }]}>{penaltyClaimed ? 'Ceza Alındı' : 'Kaybeden Cezası'}</Text>
                    <Text style={[styles.penaltyText, { color: colors.textMuted }]}>{challenge.penalty_text}</Text>
                    {!penaltyClaimed && (
                      <TouchableOpacity
                        style={[styles.claimBtn, { backgroundColor: colors.primary }, claimLoading && styles.disabled]}
                        onPress={handleClaimPenalty}
                        disabled={claimLoading}
                      >
                        {claimLoading
                          ? <ActivityIndicator color="#FFFFFF" size="small" />
                          : <Text style={styles.claimBtnText}>Cezamı Kabul Ediyorum</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Invite actions */}
              {isInvited && (
                <View style={[styles.inviteActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.inviteText, { color: colors.text }]}>Bu challenge'a davet edildiniz!</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: colors.success }, actionLoading && styles.disabled]}
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
                      style={[styles.declineBtn, { backgroundColor: colors.danger }, actionLoading && styles.disabled]}
                      onPress={handleDecline}
                      disabled={actionLoading}
                    >
                      <Text style={styles.declineText}>✕ Reddet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!showDuelCard && (
                <Text style={[styles.rankingsTitle, { color: colors.text }]}>
                  {isActive ? '🔴 Canlı Sıralama' : 'Sıralama'}
                </Text>
              )}
            </>
          }
          renderItem={({ item, index }) => {
            const isMe = item.userId === user?.id;
            const rankIcon = index < 3 ? RANK_ICONS[index] : null;

            return (
              <View style={[styles.rankRow, { backgroundColor: colors.card, borderColor: isMe ? colors.primary : colors.border }]}>
                <Text style={[styles.rankIcon, { color: colors.textMuted }]}>{rankIcon ?? `${item.rank}`}</Text>
                <Avatar avatarId={item.avatarId} size={42} />
                <View style={styles.rankInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.rankUsername, { color: isMe ? colors.primary : colors.text }]}>
                      {item.username}{isMe ? ' (Sen)' : ''}
                    </Text>
                    {item.totalXp !== undefined && <LevelBadge xp={item.totalXp} size="sm" />}
                  </View>
                  <Text style={[styles.rankSteps, { color: colors.textMuted }]}>{item.totalSteps.toLocaleString('tr-TR')} toplam adım</Text>
                  {isActive && (
                    <Text style={[styles.todaySteps, { color: colors.success }]}>Bugün: {item.stepsToday.toLocaleString('tr-TR')} adım</Text>
                  )}
                  {isRace && challenge.step_goal && (
                    <RaceProgressBar steps={item.totalSteps} goal={challenge.step_goal} colors={colors} />
                  )}
                </View>
                {index === 0 && isCompleted && <Text style={styles.winnerBadge}>🏆</Text>}
              </View>
            );
          }}
          ListFooterComponent={
            showDuelCard ? (
              <TouchableOpacity
                style={[styles.statsCta, { backgroundColor: colors.primaryLight }]}
                onPress={() => router.push('/(tabs)/stats')}
              >
                <Text style={[styles.statsCtaText, { color: colors.primary }]}>İstatistikleri Gör</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            !showDuelCard ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz kabul eden yok</Text>
              </View>
            ) : null
          }
        />
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
  navTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  shareBtnWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: { fontSize: 13 },
  countdownBlock: { alignItems: 'center', marginBottom: 16 },
  countdownLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  countdownPill: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
  countdownText: { fontSize: 18, fontWeight: '800' },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  infoRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  dates: { fontSize: 13 },
  raceGoal: { fontSize: 13, fontWeight: '600' },
  winner: { fontSize: 15, fontWeight: '700' },
  penaltyCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  penaltyEmoji: { fontSize: 22 },
  penaltyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  penaltyText: { fontSize: 14, marginBottom: 12 },
  claimBtn: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  claimBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  inviteActions: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  inviteText: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  declineBtn: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rankIcon: { width: 36, fontSize: 20, textAlign: 'center', fontWeight: '700' },
  rankInfo: { flex: 1, marginLeft: 10 },
  rankUsername: { fontSize: 15, fontWeight: '600' },
  rankSteps: { fontSize: 13, marginTop: 1 },
  todaySteps: { fontSize: 12, marginTop: 1 },
  winnerBadge: { fontSize: 24 },
  statsCta: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  statsCtaText: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
