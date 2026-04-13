import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as challengesApi from '@/api/challenges';
import type { InviteInfo } from '@/api/challenges';

const TYPE_LABELS: Record<string, string> = { '1v1': '⚔️ 1v1', group: '👥 Grup' };
const STATUS_LABELS: Record<string, string> = {
  pending: 'Başlamadı',
  active: 'Aktif 🔴',
};

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    challengesApi.getInviteInfo(token)
      .then(setInfo)
      .catch((err: unknown) => {
        const status = (err as { response?: { status: number } })?.response?.status;
        if (status === 410) setError('Bu davet linki süresi dolmuş.');
        else if (status === 404) setError('Davet linki geçersiz.');
        else setError('Davet bilgisi yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleJoin() {
    if (!info) return;
    setJoining(true);
    try {
      const { challengeId, alreadyMember } = await challengesApi.joinByInviteToken(token);
      if (alreadyMember) {
        Alert.alert('Zaten üyesin', 'Bu challenge\'a zaten katılıyorsunuz.', [
          { text: 'Challenge\'ı Aç', onPress: () => router.replace(`/challenge/${challengeId}`) },
        ]);
        return;
      }
      router.replace(`/challenge/${challengeId}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      const errData = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) {
        Alert.alert('Dolu', 'Challenge maksimum katılımcı sayısına ulaştı.');
      } else if (status === 400) {
        Alert.alert('Katılamaz', errData ?? 'Bu challenge artık katılıma kapalı.');
      } else {
        Alert.alert('Hata', 'Challenge\'a katılınamadı. Tekrar dene.');
      }
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6C63FF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (error || !info) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🔗</Text>
          <Text style={styles.errorTitle}>Davet Bulunamadı</Text>
          <Text style={styles.errorText}>{error || 'Davet bilgisi yüklenemedi.'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.backBtnText}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFull = info.participantCount >= info.maxParticipants;
  const isJoinable = ['pending', 'active'].includes(info.status) && !isFull;
  const expiryDate = new Date(info.expiresAt).toLocaleDateString('tr-TR');

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Challenge Daveti</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.scroll}>
        {/* Invite card */}
        <View style={styles.card}>
          <Text style={styles.inviteLabel}>Seni challenge'a davet etti!</Text>
          <Text style={styles.creatorName}>👤 {info.creatorUsername}</Text>

          <View style={styles.divider} />

          {/* Challenge info */}
          <Text style={styles.challengeTitle} numberOfLines={2}>
            {info.title || (info.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[info.type]}</Text>
            </View>
            <View style={[styles.badge, info.status === 'active' && styles.activeBadge]}>
              <Text style={[styles.badgeText, info.status === 'active' && styles.activeBadgeText]}>
                {STATUS_LABELS[info.status] ?? info.status}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{info.start_date}</Text>
              <Text style={styles.infoLabel}>Başlangıç</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{info.end_date}</Text>
              <Text style={styles.infoLabel}>Bitiş</Text>
            </View>
          </View>

          <View style={styles.participantRow}>
            <Text style={styles.participantText}>
              👥 {info.participantCount} / {info.maxParticipants} katılımcı
            </Text>
            {isFull && <Text style={styles.fullBadge}>Dolu</Text>}
          </View>

          <Text style={styles.expiry}>Davet geçerlilik: {expiryDate}</Text>
        </View>

        {/* CTA */}
        {isJoinable ? (
          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.disabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.joinBtnText}>🏃 Challenge'a Katıl!</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.unavailableBox}>
            <Text style={styles.unavailableText}>
              {isFull
                ? '⚠️ Bu challenge dolu, katılamazsın.'
                : '⚠️ Bu challenge artık katılıma kapalı.'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
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
  scroll: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeBadge: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  activeBadgeText: { color: '#EF4444' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoItem: { alignItems: 'center' },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  arrow: { fontSize: 18, color: '#9CA3AF' },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  participantText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  fullBadge: {
    backgroundColor: '#FEE2E2',
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expiry: { fontSize: 12, color: '#9CA3AF' },
  joinBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  unavailableBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unavailableText: { color: '#92400E', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 52, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  backBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
