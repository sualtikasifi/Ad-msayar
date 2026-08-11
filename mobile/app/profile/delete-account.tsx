import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import * as usersApi from '@/api/users';
import { ScreenBackground } from '@/components/ScreenBackground';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, clearSession } = useAuthStore();
  const isGuest = user?.is_guest ?? false;

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const confirmReady = isGuest
    ? confirmText.trim().toUpperCase() === 'SİL'
    : password.length > 0 && confirmText.trim().toUpperCase() === 'SİL';

  async function handleDelete() {
    setError('');
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verilerin (adımlar, arkadaşlar, challenge geçmişi) kalıcı olarak silinecek. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await usersApi.deleteAccount(isGuest ? undefined : password);
              await clearSession();
              router.replace('/(auth)/login');
            } catch (err: unknown) {
              const status = (err as { response?: { status: number } })?.response?.status;
              setError(status === 401 ? 'Şifre yanlış' : 'Hesap silinemedi, tekrar dene');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Hesabı Sil</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={[styles.title, { color: colors.text }]}>Bu işlem kalıcıdır</Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            Hesabını sildiğinde profilin, adım geçmişin, arkadaşlıkların ve challenge kayıtların
            kalıcı olarak silinir. Bu işlem geri alınamaz.
          </Text>

          {!isGuest && (
            <>
              <Text style={[styles.label, { color: colors.textMuted }]}>Şifreni gir</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••"
                placeholderTextColor={colors.textMuted}
              />
            </>
          )}

          <Text style={[styles.label, { color: colors.textMuted }]}>
            Onaylamak için &quot;SİL&quot; yaz
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="SİL"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={[styles.errorMsg, { color: colors.danger }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.danger }, (!confirmReady || loading) && styles.disabled]}
            onPress={handleDelete}
            disabled={!confirmReady || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteBtnText}>Hesabımı Kalıcı Olarak Sil</Text>
            )}
          </TouchableOpacity>
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
  content: { padding: 24 },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  errorMsg: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  deleteBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  deleteBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
