import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useChallengeStore } from '@/store/challengeStore';
import { useFriendStore } from '@/store/friendStore';
import { useTheme } from '@/context/ThemeContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { challenges, loadChallenges } = useChallengeStore();
  const { pendingRequests, loadPendingRequests, acceptRequest, declineRequest } = useFriendStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingChallenges = challenges.filter((c) => c.status === 'pending' && c.my_status === 'invited');

  const load = useCallback(() => {
    return Promise.all([loadChallenges(), loadPendingRequests()]).catch(console.error);
  }, [loadChallenges, loadPendingRequests]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAccept(id: string) {
    setActionLoading(id);
    try {
      await acceptRequest(id);
    } catch {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(id: string) {
    setActionLoading(id);
    try {
      await declineRequest(id);
    } catch {
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setActionLoading(null);
    }
  }

  const isEmpty = pendingChallenges.length === 0 && pendingRequests.length === 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Bildirimler</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {isEmpty && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Yeni bildirim yok</Text>
            </View>
          )}

          {pendingChallenges.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>📬 CHALLENGE DAVETLERİ</Text>
              {pendingChallenges.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/challenge/${c.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rowIcon}>{c.type === '1v1' ? '⚔️' : '👥'}</Text>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {c.title || (c.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>Seni davet etti</Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>🤝 ARKADAŞLIK İSTEKLERİ</Text>
              {pendingRequests.map((r) => (
                <View key={r.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Avatar avatarId={r.from_user?.avatar_id ?? 1} size={36} />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {r.from_user?.username ?? 'Bilinmiyor'}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>Arkadaşlık isteği gönderdi</Text>
                  </View>
                  {actionLoading === r.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: colors.success }]}
                        onPress={() => handleAccept(r.id)}
                        accessibilityLabel="Kabul et"
                        accessibilityRole="button"
                      >
                        <Text style={styles.actionText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.declineBtn, { backgroundColor: colors.danger }]}
                        onPress={() => handleDecline(r.id)}
                        accessibilityLabel="Reddet"
                        accessibilityRole="button"
                      >
                        <Text style={styles.actionText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  section: { marginTop: 8, marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  rowIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  rowInfo: { flex: 1, marginLeft: 10 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, fontWeight: '700' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
