import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useChallengeStore } from '@/store/challengeStore';
import { useFriendStore } from '@/store/friendStore';
import { useTheme } from '@/context/ThemeContext';

/**
 * Shared top bar for the main tab screens: user avatar (→ profile),
 * app name, and a notification bell that badges when there are pending
 * challenge invites or friend requests, and opens the Notifications screen.
 */
export function AppHeader() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { challenges } = useChallengeStore();
  const { pendingRequests } = useFriendStore();

  const pendingChallengeCount = challenges.filter((c) => c.status === 'pending' && c.my_status === 'invited').length;
  const pendingCount = pendingChallengeCount + pendingRequests.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => user && router.push(`/profile/${user.id}`)}
        accessibilityLabel="Profilim"
        accessibilityRole="button"
      >
        <Avatar avatarId={user?.avatar_id ?? 1} size={36} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.primary }]}>Adımsayar</Text>

      <TouchableOpacity
        onPress={() => router.push('/notifications')}
        style={[styles.bellWrap, { backgroundColor: colors.cardAlt }]}
        accessibilityLabel={pendingCount > 0 ? `Bildirimler, ${pendingCount} yeni` : 'Bildirimler'}
        accessibilityRole="button"
      >
        <Text style={styles.bell}>🔔</Text>
        {pendingCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.bg }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  bellWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
