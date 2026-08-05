import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as notificationsApi from '@/api/notifications';
import * as usersApi from '@/api/users';
import type { NotificationPreferences } from '@/api/notifications';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeMode } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';

const STEP_GOAL_PRESETS = [5000, 7500, 10000, 12500, 15000, 20000];

type PrefKey = keyof NotificationPreferences;

const PREF_ITEMS: { key: PrefKey; title: string; desc: string; emoji: string }[] = [
  {
    key: 'challenge_invite',
    title: 'Challenge Daveti',
    desc: 'Seni bir challenge\'a davet ettiklerinde bildirim al',
    emoji: '🏆',
  },
  {
    key: 'challenge_started',
    title: 'Challenge Başladı',
    desc: 'Bir challenge başladığında bildirim al',
    emoji: '🚀',
  },
  {
    key: 'friend_request',
    title: 'Arkadaşlık İsteği',
    desc: 'Yeni arkadaşlık isteklerinde bildirim al',
    emoji: '🤝',
  },
  {
    key: 'daily_reminder',
    title: 'Günlük Hatırlatıcı',
    desc: 'Her gün saat 20:00\'de adım hatırlatması al',
    emoji: '👟',
  },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; emoji: string }[] = [
  { mode: 'system', label: 'Sistem', emoji: '⚙️' },
  { mode: 'light', label: 'Açık', emoji: '☀️' },
  { mode: 'dark', label: 'Koyu', emoji: '🌙' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const { user, updateUser } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [goalSaving, setGoalSaving] = useState(false);
  const currentGoal = user?.daily_step_goal ?? 10000;

  async function handleGoalChange(goal: number) {
    if (goal === currentGoal) return;
    setGoalSaving(true);
    try {
      const updated = await usersApi.updateStepGoal(goal);
      await updateUser({ daily_step_goal: updated.daily_step_goal });
    } catch {
      Alert.alert('Hata', 'Hedef kaydedilemedi');
    } finally {
      setGoalSaving(false);
    }
  }

  useEffect(() => {
    notificationsApi.getNotificationPreferences()
      .then(setPrefs)
      .catch(() => Alert.alert('Hata', 'Ayarlar yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: PrefKey, value: boolean) {
    if (!prefs) return;
    const prev = prefs;
    // Optimistic update
    setPrefs({ ...prefs, [key]: value });
    setSaving(key);
    try {
      const updated = await notificationsApi.updateNotificationPreferences({ [key]: value });
      setPrefs(updated);
    } catch {
      setPrefs(prev);
      Alert.alert('Hata', 'Ayar kaydedilemedi');
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.bg }}>
        {/* Step Goal section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>👟 Günlük Adım Hedefi</Text>
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Şu anki hedef: <Text style={{ color: colors.primary, fontWeight: '700' }}>{currentGoal.toLocaleString()} adım</Text>
        </Text>
        <View style={styles.goalGrid}>
          {STEP_GOAL_PRESETS.map((goal) => {
            const active = goal === currentGoal;
            return (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.goalChip,
                  { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.card },
                  (goalSaving && !active) && { opacity: 0.5 },
                ]}
                onPress={() => void handleGoalChange(goal)}
                disabled={goalSaving}
              >
                {goalSaving && active
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.goalChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                      {goal >= 1000 ? `${goal / 1000}B` : goal}
                    </Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Theme section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🌗 Tema</Text>
        <View style={[styles.list, { backgroundColor: colors.card, shadowColor: colors.text }]}>
          {THEME_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.themeRow,
                { borderBottomColor: colors.border },
                i === THEME_OPTIONS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => void setThemeMode(opt.mode)}
            >
              <Text style={styles.rowEmoji}>{opt.emoji}</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{opt.label}</Text>
              {themeMode === opt.mode && (
                <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Bildirim Tercihleri</Text>
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Hangi bildirim türlerini almak istediğini seç.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={[styles.list, { backgroundColor: colors.card, shadowColor: colors.text }]}>
            {PREF_ITEMS.map((item) => (
              <View key={item.key} style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowEmoji}>{item.emoji}</Text>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                </View>
                {saving === item.key ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={prefs?.[item.key] ?? true}
                    onValueChange={(v) => void handleToggle(item.key, v)}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={prefs?.[item.key] ? colors.primary : colors.textMuted}
                    disabled={saving !== null}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Tehlikeli Bölge</Text>
        <View style={[styles.list, { backgroundColor: colors.card, shadowColor: colors.text }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/profile/delete-account')}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🗑️</Text>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Hesabımı Sil</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>
                  Tüm verilerini kalıcı olarak siler
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
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
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checkmark: { marginLeft: 'auto', fontSize: 16, fontWeight: '700' },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  goalChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 72,
    alignItems: 'center',
  },
  goalChipText: { fontSize: 15, fontWeight: '700' },
  list: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowEmoji: { fontSize: 22, marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  rowDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
