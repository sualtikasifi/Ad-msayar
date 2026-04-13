import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useAchievementStore } from '@/store/achievementStore';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socketService';
import { registerBackgroundTask } from '@/services/backgroundSteps';
import { AchievementToastManager } from '@/components/AchievementToast';
import type { Achievement } from '@/api/achievements';

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const { addPendingToast } = useAchievementStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    connectSocket()
      .then((socket) => {
        // Listen for achievement earned events globally
        socket.on('achievement:earned', ({ achievement }: { achievement: Achievement }) => {
          addPendingToast(achievement);
        });
      })
      .catch(console.error);

    registerBackgroundTask().catch(console.error);

    return () => {
      const socket = getSocket();
      socket?.off('achievement:earned');
      disconnectSocket();
    };
  }, [isAuthenticated, addPendingToast]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="challenge" />
            <Stack.Screen name="profile" />
          </Stack>
          {/* Global achievement toast — renders above all screens */}
          <AchievementToastManager />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
