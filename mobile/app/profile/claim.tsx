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

export default function ClaimAccountScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Hesabını Oluştur</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>🔓</Text>
            <Text style={styles.heroTitle}>Verilerini Koru!</Text>
            <Text style={styles.heroSubtitle}>
              Adımların, rozetlerin ve challenge geçmişin kaybolmasın.{'\n'}
              Şimdi ücretsiz hesap oluştur, her şey burada kalır.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Kullanıcı Adı</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(v) => { setUsername(v); setError(''); }}
              placeholder="kullanici_adi"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              placeholder="En az 6 karakter"
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Şifre Tekrar</Text>
            <TextInput
              style={[
                styles.input,
                password && confirmPassword && password !== confirmPassword && styles.inputError,
              ]}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
              placeholder="Şifreyi tekrar girin"
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.claimBtn, loading && styles.disabled]}
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
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ya da</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Existing account */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={async () => {
              // Logout guest (data will be lost) then go to login
              await useAuthStore.getState().logout();
            }}
          >
            <Text style={styles.loginBtnText}>Mevcut hesabımla giriş yap</Text>
          </TouchableOpacity>
          <Text style={styles.loginWarning}>
            ⚠️ Mevcut hesabınla giriş yaparsan misafir verilerini kaybedersin
          </Text>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: 16 },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  heroIcon: { fontSize: 52, marginBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
  },
  inputError: { borderColor: '#EF4444' },
  errorMsg: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  claimBtn: {
    backgroundColor: '#6C63FF',
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
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  loginBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loginBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  loginWarning: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
});
