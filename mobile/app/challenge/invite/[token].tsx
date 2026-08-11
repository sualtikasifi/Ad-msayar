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
import { ScreenBackground } from '@/components/ScreenBackground';
import { useTheme } from '@/context/ThemeContext';

const TYPE_LABELS: Record<string, string> = { '1v1': '⚔️ 1v1', group: '👥 Grup' };
const STATUS_LABELS: Record<string, string> = {
  pending: 'Başlamadı',
  active: 'Aktif 🔴',
};

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { colors } = useTheme();

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
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (error || !info) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🔗</Text>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Davet Bulunamadı</Text>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>{error || 'Davet bilgisi yüklenemedi.'}</Text>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.backBtnText}>Ana Sayfaya Dön</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const isFull = info.participantCount >= info.maxParticipants;
  const isJoinable = ['pending', 'active'].includes(info.status) && !isFull;
  const expiryDate = new Date(info.expiresAt).toLocaleDateString('tr-TR');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Challenge Daveti</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.scroll}>
          {/* Invite card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.inviteLabel, { color: colors.textMuted }]}>Seni challenge'a davet etti!</Text>
            <Text style={[styles.creatorName, { color: colors.text }]}>👤 {info.creatorUsername}</Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Challenge info */}
            <Text style={[styles.challengeTitle, { color: colors.text }]} numberOfLines={2}>
              {info.title || (info.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}
            </Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{TYPE_LABELS[info.type]}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: info.status === 'active' ? 'rgba(239,68,68,0.16)' : colors.cardAlt }]}>
                <Text style={[styles.badgeText, { color: info.status === 'active' ? colors.danger : colors.textSecondary }]}>
                  {STATUS_LABELS[info.status] ?? info.status}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRow, { backgroundColor: colors.cardAlt }]}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoValue, { color: colors.text }]}>{info.start_date}</Text>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Başlangıç</Text>
              </View>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>→</Text>
              <View style={styles.infoItem}>
                <Text style={[styles.infoValue, { color: colors.text }]}>{info.end_date}</Text>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Bitiş</Text>
              </View>
            </View>

            <View style={styles.participantRow}>
              <Text style={[styles.participantText, { color: colors.textMuted }]}>
                👥 {info.participantCount} / {info.maxParticipants} katılımcı
              </Text>
              {isFull && (
                <Text style={[styles.fullBadge, { backgroundColor: 'rgba(239,68,68,0.16)', color: colors.danger }]}>Dolu</Text>
              )}
            </View>

            <Text style={[styles.expiry, { color: colors.textMuted }]}>Davet geçerlilik: {expiryDate}</Text>
          </View>

          {/* CTA */}
          {isJoinable ? (
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: colors.primary }, joining && styles.disabled]}
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
            <View style={[styles.unavailableBox, { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: colors.warning }]}>
              <Text style={[styles.unavailableText, { color: colors.warning }]}>
                {isFull
                  ? '⚠️ Bu challenge dolu, katılamazsın.'
                  : '⚠️ Bu challenge artık katılıma kapalı.'}
              </Text>
            </View>
          )}
        </View>
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
  scroll: { flex: 1, padding: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoItem: { alignItems: 'center' },
  infoValue: { fontSize: 16, fontWeight: '700' },
  infoLabel: { fontSize: 11, marginTop: 2 },
  arrow: { fontSize: 18 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  participantText: { fontSize: 14, fontWeight: '500' },
  fullBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  expiry: { fontSize: 12 },
  joinBtn: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  joinBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  unavailableBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  unavailableText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 52, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorText: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  backBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
