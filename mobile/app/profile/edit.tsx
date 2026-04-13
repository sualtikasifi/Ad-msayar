import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import * as usersApi from '@/api/users';
import { Avatar } from '@/components/Avatar';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [username, setUsername] = useState(user?.username ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);

  async function pickImage(source: 'library' | 'camera') {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    };

    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Fotoğraf kütüphanesine erişim için izin vermeniz gerekiyor.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Hata', 'Görsel okunamadı.');
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const imageData = `data:${mimeType};base64,${asset.base64}`;

      setAvatarUploading(true);
      try {
        const { avatar_url } = await usersApi.uploadAvatar(imageData);
        await updateUser({ avatar_url });
        setAvatarPreview(avatar_url);
        setProfileSuccess('Profil fotoğrafı güncellendi');
        setProfileError('');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        setProfileError(msg || 'Fotoğraf yüklenemedi');
      } finally {
        setAvatarUploading(false);
      }
    } catch {
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    }
  }

  function showImagePicker() {
    Alert.alert('Fotoğraf Seç', 'Kaynak seçin', [
      { text: 'Kütüphane', onPress: () => pickImage('library') },
      { text: 'Kamera', onPress: () => pickImage('camera') },
      { text: 'İptal', style: 'cancel' },
    ]);
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

  const displayAvatarUrl = avatarPreview ?? user?.avatar_url ?? null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profili Düzenle</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil Fotoğrafı</Text>
          <View style={styles.avatarRow}>
            {avatarUploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#6C63FF" />
              </View>
            ) : displayAvatarUrl ? (
              <Image
                source={{ uri: displayAvatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Avatar username={user?.username ?? '?'} avatarUrl={null} size={80} />
            )}
            <TouchableOpacity
              style={[styles.changePhotoBtn, avatarUploading && styles.disabled]}
              onPress={showImagePicker}
              disabled={avatarUploading}
            >
              <Text style={styles.changePhotoText}>
                {avatarUploading ? 'Yükleniyor…' : 'Fotoğraf Değiştir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Kullanıcı Adı ─────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kullanıcı Adı</Text>
          <Text style={styles.label}>E-posta</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{user?.email ?? '—'}</Text>
          </View>
          <Text style={styles.label}>Kullanıcı Adı</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(v) => {
              setUsername(v);
              setProfileSuccess('');
              setProfileError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="kullanici_adi"
            placeholderTextColor="#9CA3AF"
          />

          {profileSuccess ? <Text style={styles.successMsg}>{profileSuccess}</Text> : null}
          {profileError ? <Text style={styles.errorMsg}>{profileError}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, profileLoading && styles.disabled]}
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Şifre Değiştir</Text>
          <Text style={styles.label}>Mevcut Şifre</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              setPasswordSuccess('');
              setPasswordError('');
            }}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.label}>Yeni Şifre</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setPasswordSuccess('');
              setPasswordError('');
            }}
            secureTextEntry
            placeholder="En az 6 karakter"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.label}>Yeni Şifre Tekrar</Text>
          <TextInput
            style={[styles.input, newPassword && confirmPassword && newPassword !== confirmPassword && styles.inputError]}
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setPasswordSuccess('');
              setPasswordError('');
            }}
            secureTextEntry
            placeholder="Şifreyi tekrar girin"
            placeholderTextColor="#9CA3AF"
          />

          {passwordSuccess ? <Text style={styles.successMsg}>{passwordSuccess}</Text> : null}
          {passwordError ? <Text style={styles.errorMsg}>{passwordError}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, passwordLoading && styles.disabled]}
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
  scroll: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  avatarRow: {
    alignItems: 'center',
    gap: 14,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  changePhotoText: {
    color: '#6C63FF',
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  readonlyField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  successMsg: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  errorMsg: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
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
