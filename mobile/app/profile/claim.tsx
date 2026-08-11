import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as authApi from '@/api/auth';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useTheme } from '@/context/ThemeContext';

export default function ClaimAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { updateUser } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClaim() {
    setError('');

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Tüm alanları doldurun');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username.trim())) {
      setError('Kullanıcı adı 3-32 karakter, sadece harf/rakam/alt çizgi');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Geçerli bir email girin');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      const { user } = await authApi.claimAccount(username.trim(), email.trim(), password);
      // Tokens remain valid — just update user object in store
      await updateUser({
        username: user.username,
        is_guest: false,
      });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 409) {
        setError('Bu kullanıcı adı veya email zaten kullanılıyor');
      } else {
        setError('Hesap oluşturulamadı. Tekrar dene.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Nav */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
            </TouchableOpacity>
            <Text style={[styles.navTitle, { color: colors.text }]}>Hesabını Oluştur</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroIcon}>🔓</Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Verilerini Koru!</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                Adımların, rozetlerin ve challenge geçmişin kaybolmasın.{'\n'}
                Şimdi ücretsiz hesap oluştur, her şey burada kalır.
              </Text>
            </View>

            {/* Form */}
            <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Kullanıcı Adı</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={username}
                onChangeText={(v) => { setUsername(v); setError(''); }}
                placeholder="kullanici_adi"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Şifre</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="En az 6 karakter"
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Şifre Tekrar</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
                  password && confirmPassword && password !== confirmPassword && { borderColor: colors.danger },
                ]}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                placeholder="Şifreyi tekrar girin"
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />

              {error ? <Text style={[styles.errorMsg, { color: colors.danger }]}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: colors.primary }, loading && styles.disabled]}
                onPress={handleClaim}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.claimBtnText}>Hesabımı Oluştur</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>ya da</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Existing account */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                // Logout guest (data will be lost) then go to login
                await useAuthStore.getState().logout();
              }}
            >
              <Text style={[styles.loginBtnText, { color: colors.textSecondary }]}>Mevcut hesabımla giriş yap</Text>
            </TouchableOpacity>
            <Text style={[styles.loginWarning, { color: colors.textMuted }]}>
              ⚠️ Mevcut hesabınla giriş yaparsan misafir verilerini kaybedersin
            </Text>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  scroll: { padding: 16 },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  heroIcon: { fontSize: 52, marginBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorMsg: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  claimBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  claimBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  loginBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  loginBtnText: { fontSize: 15, fontWeight: '600' },
  loginWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
