import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useFriendStore } from '@/store/friendStore';
import * as challengesApi from '@/api/challenges';
import type { ChallengeType, ChallengeMode } from '@/types';
import { useTheme } from '@/context/ThemeContext';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const MODES: { mode: ChallengeMode; emoji: string; label: string; forcedType?: ChallengeType }[] = [
  { mode: 'standard', emoji: '🏆', label: 'Standart' },
  { mode: 'duel', emoji: '⚔️', label: 'Düello', forcedType: '1v1' },
  { mode: 'race', emoji: '🎯', label: 'Hedef' },
];

interface InlineChallengeCreatorProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function InlineChallengeCreator({ onCreated, onCancel }: InlineChallengeCreatorProps) {
  const { colors } = useTheme();
  const { friends, loadFriends } = useFriendStore();

  const [mode, setMode] = useState<ChallengeMode>('standard');
  const [type, setType] = useState<ChallengeType>('1v1');
  const [stepGoal, setStepGoal] = useState('');
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyText, setPenaltyText] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends().catch(console.error);
  }, [loadFriends]);

  const isDuel = mode === 'duel';
  const isRace = mode === 'race';
  const effectiveType: ChallengeType = isDuel ? '1v1' : type;
  const maxParticipants = effectiveType === '1v1' ? 1 : 3;

  function selectMode(opt: typeof MODES[number]) {
    setMode(opt.mode);
    setSelected([]);
    if (opt.forcedType) setType(opt.forcedType);
  }

  function toggleFriend(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxParticipants) return prev;
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (selected.length === 0) {
      Alert.alert('Hata', 'En az 1 arkadaş seçmelisiniz');
      return;
    }
    if (isRace) {
      const goal = parseInt(stepGoal, 10);
      if (!stepGoal || isNaN(goal) || goal <= 0) {
        Alert.alert('Hata', 'Hedef adım sayısını girin');
        return;
      }
    }
    if (penaltyEnabled && !penaltyText.trim()) {
      Alert.alert('Hata', 'Ceza metnini girin veya kapatın');
      return;
    }

    const start = formatDate(new Date());
    const end = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return formatDate(d);
    })();

    setLoading(true);
    try {
      await challengesApi.createChallenge({
        type: effectiveType,
        mode,
        start_date: start,
        end_date: isDuel ? undefined : end,
        step_goal: isRace ? parseInt(stepGoal, 10) : undefined,
        penalty_text: penaltyEnabled ? penaltyText.trim() : undefined,
        participant_ids: selected,
      });
      onCreated();
    } catch {
      Alert.alert('Hata', 'Challenge oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Yeni Challenge</Text>
        <TouchableOpacity onPress={onCancel} accessibilityLabel="Kapat" accessibilityRole="button">
          <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Mode */}
      <View style={styles.modeRow}>
        {MODES.map((opt) => {
          const active = mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.modeChip, { backgroundColor: active ? colors.primaryLight : colors.cardAlt, borderColor: active ? colors.primary : colors.border }]}
              onPress={() => selectMode(opt)}
            >
              <Text style={styles.modeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.modeLabel, { color: active ? colors.primary : colors.textMuted }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Type — hidden for duel (forced 1v1) */}
      {!isDuel && (
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeChip, { backgroundColor: type === '1v1' ? colors.primaryLight : colors.cardAlt, borderColor: type === '1v1' ? colors.primary : colors.border }]}
            onPress={() => { setType('1v1'); setSelected([]); }}
          >
            <Text style={[styles.typeLabel, { color: type === '1v1' ? colors.primary : colors.textMuted }]}>⚔️ 1v1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, { backgroundColor: type === 'group' ? colors.primaryLight : colors.cardAlt, borderColor: type === 'group' ? colors.primary : colors.border }]}
            onPress={() => { setType('group'); setSelected([]); }}
          >
            <Text style={[styles.typeLabel, { color: type === 'group' ? colors.primary : colors.textMuted }]}>👥 Grup</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRace && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          value={stepGoal}
          onChangeText={setStepGoal}
          placeholder="Hedef adım sayısı (örn: 10000)"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
      )}

      {/* Friends */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        Arkadaş seç ({selected.length}/{maxParticipants})
      </Text>
      {friends.length === 0 ? (
        <Text style={[styles.noFriends, { color: colors.textMuted }]}>Önce arkadaş eklemen gerekiyor</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
          {friends.map((f) => {
            const isSelected = selected.includes(f.id);
            return (
              <TouchableOpacity key={f.id} style={styles.friendChip} onPress={() => toggleFriend(f.id)}>
                <View style={[styles.avatarRing, { borderColor: isSelected ? colors.primary : 'transparent' }]}>
                  <Avatar avatarId={f.avatar_id} size={44} />
                  {isSelected && (
                    <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                      <Text style={styles.checkDotText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.friendName, { color: colors.textSecondary }]} numberOfLines={1}>{f.username}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Penalty */}
      <View style={styles.penaltyHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 0 }]}>😅 Kaybeden cezası</Text>
        <Switch
          value={penaltyEnabled}
          onValueChange={setPenaltyEnabled}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={penaltyEnabled ? colors.primary : colors.textMuted}
        />
      </View>
      {penaltyEnabled && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
          value={penaltyText}
          onChangeText={setPenaltyText}
          placeholder="örn: Kahve ısmarlamak..."
          placeholderTextColor={colors.textMuted}
          maxLength={200}
        />
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.disabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>🏆 Challenge Başlat!</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  closeBtn: { fontSize: 16, fontWeight: '700', padding: 4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeChip: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  modeEmoji: { fontSize: 18 },
  modeLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeChip: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  typeLabel: { fontSize: 13, fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 8 },
  noFriends: { fontSize: 13, paddingVertical: 8 },
  friendRow: { gap: 12, paddingBottom: 4 },
  friendChip: { alignItems: 'center', width: 56 },
  avatarRing: { borderWidth: 2, borderRadius: 24, padding: 2 },
  checkDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  friendName: { fontSize: 11, marginTop: 4, width: 56, textAlign: 'center' },
  penaltyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
