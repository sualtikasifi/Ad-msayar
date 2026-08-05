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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { useFriendStore } from '@/store/friendStore';
import * as challengesApi from '@/api/challenges';
import type { ChallengeType, ChallengeMode } from '@/types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

type ModeOption = {
  mode: ChallengeMode;
  emoji: string;
  label: string;
  desc: string;
  forcedType?: ChallengeType;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'standard',
    emoji: '🏆',
    label: 'Standart',
    desc: 'Süre sonunda en çok adım atan kazanır',
  },
  {
    mode: 'duel',
    emoji: '⚔️',
    label: 'Düello',
    desc: '24 saat 1v1 yarış, süre sonunda kazanan belli olur',
    forcedType: '1v1',
  },
  {
    mode: 'race',
    emoji: '🎯',
    label: 'Hedef Yarışı',
    desc: 'Belirlenen adım hedefine ilk ulaşan kazanır',
  },
];

export default function NewChallengeScreen() {
  const router = useRouter();
  const { friends, loadFriends } = useFriendStore();

  const [mode, setMode] = useState<ChallengeMode>('standard');
  const [type, setType] = useState<ChallengeType>('1v1');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  });
  const [stepGoal, setStepGoal] = useState('');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyText, setPenaltyText] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends().catch(console.error);
  }, [loadFriends]);

  function selectMode(opt: ModeOption) {
    setMode(opt.mode);
    setSelected([]);
    if (opt.forcedType) {
      setType(opt.forcedType);
    }
  }

  const isDuel = mode === 'duel';
  const isRace = mode === 'race';
  const effectiveType: ChallengeType = isDuel ? '1v1' : type;
  const maxParticipants = effectiveType === '1v1' ? 1 : 3;

  function toggleFriend(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxParticipants) {
        Alert.alert('Limit', effectiveType === '1v1' ? '1v1 için sadece 1 kişi seçilebilir' : 'En fazla 3 kişi seçilebilir');
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
    if (effectiveType === '1v1' && selected.length !== 1) {
      Alert.alert('Hata', '1v1 için tam olarak 1 kişi seçin');
      return;
    }
    if (isRace) {
      const goal = parseInt(stepGoal, 10);
      if (!stepGoal || isNaN(goal) || goal <= 0) {
        Alert.alert('Hata', 'Hedef adım sayısını girin');
        return;
      }
    }
    if (!isDuel && new Date(endDate) < new Date(startDate)) {
      Alert.alert('Hata', 'Bitiş tarihi başlangıç tarihinden önce olamaz');
      return;
    }
    if (penaltyEnabled && !penaltyText.trim()) {
      Alert.alert('Hata', 'Ceza metnini girin veya ceza özelliğini kapatın');
      return;
    }

    setLoading(true);
    try {
      await challengesApi.createChallenge({
        type: effectiveType,
        mode,
        title: title.trim() || undefined,
        start_date: startDate,
        end_date: isDuel ? undefined : endDate,
        step_goal: isRace ? parseInt(stepGoal, 10) : undefined,
        penalty_text: penaltyEnabled ? penaltyText.trim() : undefined,
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

        {/* Mode selector */}
        <Text style={styles.label}>Challenge Modu</Text>
        <View style={styles.modeGrid}>
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[styles.modeCard, active && styles.activeModeCard]}
                onPress={() => selectMode(opt)}
              >
                <Text style={styles.modeEmoji}>{opt.emoji}</Text>
                <Text style={[styles.modeLabel, active && styles.activeModeLabel]}>{opt.label}</Text>
                <Text style={styles.modeDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Type selector — hidden for duel (forced 1v1) */}
        {!isDuel && (
          <>
            <Text style={styles.label}>Katılımcı Türü</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === '1v1' && styles.activeType]}
                onPress={() => { setType('1v1'); setSelected([]); }}
              >
                <Text style={styles.typeEmoji}>⚔️</Text>
                <Text style={[styles.typeLabel, type === '1v1' && styles.activeTypeLabel]}>1 vs 1</Text>
                <Text style={styles.typeSubLabel}>2 kişi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'group' && styles.activeType]}
                onPress={() => { setType('group'); setSelected([]); }}
              >
                <Text style={styles.typeEmoji}>👥</Text>
                <Text style={[styles.typeLabel, type === 'group' && styles.activeTypeLabel]}>Grup</Text>
                <Text style={styles.typeSubLabel}>2-4 kişi</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Title */}
        <Text style={styles.label}>Başlık (isteğe bağlı)</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Challenge ismi..."
          maxLength={100}
        />

        {/* Race: step goal */}
        {isRace && (
          <>
            <Text style={styles.label}>Hedef Adım Sayısı</Text>
            <TextInput
              style={styles.input}
              value={stepGoal}
              onChangeText={setStepGoal}
              placeholder="örn: 10000"
              keyboardType="number-pad"
            />
          </>
        )}

        {/* Dates — duel hides end_date */}
        <Text style={styles.label}>Başlangıç Tarihi</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        {!isDuel && (
          <>
            <Text style={styles.label}>Bitiş Tarihi</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}

        {isDuel && (
          <View style={styles.duelNote}>
            <Text style={styles.duelNoteText}>⏱ Düello başladıktan 24 saat sonra otomatik tamamlanır</Text>
          </View>
        )}

        {/* Penalty toggle */}
        <View style={styles.penaltyHeader}>
          <View>
            <Text style={styles.label}>😅 Kaybeden Cezası</Text>
            <Text style={styles.penaltySubLabel}>Kaybedene hatırlatma gönderilir</Text>
          </View>
          <Switch
            value={penaltyEnabled}
            onValueChange={setPenaltyEnabled}
            trackColor={{ false: '#E5E7EB', true: '#C4BFFF' }}
            thumbColor={penaltyEnabled ? '#6C63FF' : '#9CA3AF'}
          />
        </View>
        {penaltyEnabled && (
          <TextInput
            style={[styles.input, styles.penaltyInput]}
            value={penaltyText}
            onChangeText={setPenaltyText}
            placeholder="örn: Kahve ısmarlamak, story atmak..."
            maxLength={200}
            multiline
          />
        )}

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
                <Avatar avatarId={f.avatar_id} size={40} />
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
  modeGrid: {
    gap: 10,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  activeModeCard: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EEFF',
  },
  modeEmoji: { fontSize: 24, marginBottom: 4 },
  modeLabel: { fontSize: 16, fontWeight: '700', color: '#9CA3AF', marginBottom: 2 },
  activeModeLabel: { color: '#6C63FF' },
  modeDesc: { fontSize: 12, color: '#9CA3AF' },
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
  activeType: {
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
  penaltyInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  duelNote: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  duelNoteText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  penaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  penaltySubLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
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
