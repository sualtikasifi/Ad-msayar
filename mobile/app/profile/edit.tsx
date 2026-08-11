import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as usersApi from '@/api/users';
import { Avatar } from '@/components/Avatar';
import { AVATAR_IDS } from '@/constants/avatars';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useTheme } from '@/context/ThemeContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [username, setUsername] = useState(user?.username ?? '');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [avatarSaving, setAvatarSaving] = useState(false);

  async function handleSelectAvatar(avatarId: number) {
    if (avatarId === user?.avatar_id || avatarSaving) return;
    setAvatarSaving(true);
    try {
      const updated = await usersApi.updateProfile({ avatar_id: avatarId });
      await updateUser({ avatar_id: updated.avatar_id });
      setProfileSuccess('Profil fotoğrafı güncellendi');
      setProfileError('');
    } catch {
      setProfileError('Fotoğraf güncellenemedi');
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleSaveProfile() {
    if (username.trim().length < 3) {
      setProfileError('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }
    if (username === user?.username) {
      setProfileError('Değişiklik yapılmadı');
      return;
    }

    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const updated = await usersApi.updateProfile({ username: username.trim() });
      await updateUser({ username: updated.username });
      setProfileSuccess('Kullanıcı adı güncellendi');
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 409) {
        setProfileError('Bu kullanıcı adı zaten kullanılıyor');
      } else {
        setProfileError('Güncelleme başarısız');
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword() {
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tüm alanları doldurun');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalı');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor');
      return;
    }

    setPasswordLoading(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Şifre başarıyla güncellendi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 401) {
        setPasswordError('Mevcut şifre yanlış');
      } else {
        setPasswordError('Şifre değiştirilemedi');
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.primary }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Profili Düzenle</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Avatar ───────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profil Fotoğrafı</Text>
            <View style={styles.avatarPickerRow}>
              {AVATAR_IDS.map((id) => {
                const selected = id === user?.avatar_id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.avatarOption, { borderColor: selected ? colors.primary : 'transparent' }]}
                    onPress={() => handleSelectAvatar(id)}
                    disabled={avatarSaving}
                    activeOpacity={0.7}
                  >
                    <Avatar avatarId={id} size={56} />
                    {avatarSaving && selected && (
                      <View style={styles.avatarOptionLoading}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Kullanıcı Adı ─────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kullanıcı Adı</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>E-posta</Text>
            <View style={[styles.readonlyField, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.readonlyText, { color: colors.textMuted }]}>{user?.email ?? '—'}</Text>
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>Kullanıcı Adı</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                setProfileSuccess('');
                setProfileError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="kullanici_adi"
              placeholderTextColor={colors.textMuted}
            />

            {profileSuccess ? <Text style={[styles.successMsg, { color: colors.success }]}>{profileSuccess}</Text> : null}
            {profileError ? <Text style={[styles.errorMsg, { color: colors.danger }]}>{profileError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, profileLoading && styles.disabled]}
              onPress={handleSaveProfile}
              disabled={profileLoading}
            >
              {profileLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Şifre Değiştir ────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Şifre Değiştir</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Mevcut Şifre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                setPasswordSuccess('');
                setPasswordError('');
              }}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Yeni Şifre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                setPasswordSuccess('');
                setPasswordError('');
              }}
              secureTextEntry
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Yeni Şifre Tekrar</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
                newPassword && confirmPassword && newPassword !== confirmPassword && { borderColor: colors.danger },
              ]}
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setPasswordSuccess('');
                setPasswordError('');
              }}
              secureTextEntry
              placeholder="Şifreyi tekrar girin"
              placeholderTextColor={colors.textMuted}
            />

            {passwordSuccess ? <Text style={[styles.successMsg, { color: colors.success }]}>{passwordSuccess}</Text> : null}
            {passwordError ? <Text style={[styles.errorMsg, { color: colors.danger }]}>{passwordError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, passwordLoading && styles.disabled]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Şifreyi Güncelle</Text>
              )}
            </TouchableOpacity>
          </View>

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
  scroll: { padding: 16, gap: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarOptionLoading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  readonlyField: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: {
    fontSize: 15,
  },
  successMsg: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  errorMsg: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  saveBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: { opacity: 0.6 },
});
