import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { useFriendStore } from '@/store/friendStore';
import * as challengesApi from '@/api/challenges';
import type { ChallengeType } from '@/types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function NewChallengeScreen() {
  const router = useRouter();
  const { friends, loadFriends } = useFriendStore();
  const [type, setType] = useState<ChallengeType>('1v1');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends().catch(console.error);
  }, [loadFriends]);

  const maxParticipants = type === '1v1' ? 1 : 3;

  function toggleFriend(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxParticipants) {
        Alert.alert('Limit', type === '1v1' ? '1v1 için sadece 1 kişi seçilebilir' : 'En fazla 3 kişi seçilebilir');
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (selected.length === 0) {
      Alert.alert('Hata', 'En az 1 arkadaş seçmelisiniz');
      return;
    }
    if (type === '1v1' && selected.length !== 1) {
      Alert.alert('Hata', '1v1 için tam olarak 1 kişi seçin');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      Alert.alert('Hata', 'Bitiş tarihi başlangıç tarihinden önce olamaz');
      return;
    }

    setLoading(true);
    try {
      await challengesApi.createChallenge({
        type,
        title: title.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        participant_ids: selected,
      });
      Alert.alert('Başarılı', 'Challenge oluşturuldu! Katılımcılara davet gönderildi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Hata', 'Challenge oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Yeni Challenge</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Type selector */}
        <Text style={styles.label}>Challenge Türü</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === '1v1' && styles.activetype]}
            onPress={() => { setType('1v1'); setSelected([]); }}
          >
            <Text style={[styles.typeEmoji]}>⚔️</Text>
            <Text style={[styles.typeLabel, type === '1v1' && styles.activeTypeLabel]}>1 vs 1</Text>
            <Text style={styles.typeSubLabel}>2 kişi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'group' && styles.activetype]}
            onPress={() => { setType('group'); setSelected([]); }}
          >
            <Text style={styles.typeEmoji}>👥</Text>
            <Text style={[styles.typeLabel, type === 'group' && styles.activeTypeLabel]}>Grup</Text>
            <Text style={styles.typeSubLabel}>2-4 kişi</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.label}>Başlık (isteğe bağlı)</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Challenge ismi..."
          maxLength={100}
        />

        {/* Dates */}
        <Text style={styles.label}>Başlangıç Tarihi</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Bitiş Tarihi</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        {/* Friend selection */}
        <Text style={styles.label}>
          Arkadaş Seç ({selected.length}/{maxParticipants})
        </Text>
        {friends.length === 0 ? (
          <Text style={styles.noFriends}>Önce arkadaş eklemeniz gerekiyor</Text>
        ) : (
          friends.map((f) => {
            const isSelected = selected.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.friendRow, isSelected && styles.selectedRow]}
                onPress={() => toggleFriend(f.id)}
              >
                <Avatar username={f.username} avatarUrl={f.avatar_url} size={40} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{f.username}</Text>
                  <Text style={styles.friendSteps}>{f.today_steps.toLocaleString()} adım bugün</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>🏆 Challenge Başlat!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { flex: 1, paddingHorizontal: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  activetype: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EEFF',
  },
  typeEmoji: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  activeTypeLabel: { color: '#6C63FF' },
  typeSubLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
  },
  noFriends: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 20 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  selectedRow: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EEFF',
  },
  friendInfo: { flex: 1, marginLeft: 12 },
  friendName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  friendSteps: { fontSize: 12, color: '#6B7280' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
