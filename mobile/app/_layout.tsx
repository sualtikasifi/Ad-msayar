import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { useAchievementStore } from '@/store/achievementStore';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socketService';
import { registerBackgroundTask } from '@/services/backgroundSteps';
import '@/widgets/widgetTask'; // register Android widget task handler
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getInitialNotification,
} from '@/services/notificationService';
import { AchievementToastManager } from '@/components/AchievementToast';
import type { Achievement } from '@/api/achievements';

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadFromStorage, createGuestSession } = useAuthStore();
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
      // Auto-create a guest session — redirect to login only if it fails
      createGuestSession().catch(() => router.replace('/(auth)/login'));
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router, createGuestSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    connectSocket()
      .then((socket) => {
        socket.on('achievement:earned', ({ achievement }: { achievement: Achievement }) => {
          addPendingToast(achievement);
        });
      })
      .catch(console.error);

    registerBackgroundTask().catch(console.error);

    // Register push notifications and handle tap-navigation
    registerForPushNotifications().catch(console.error);

    // Handle tap on notification while app was backgrounded
    const cleanupListeners = setupNotificationListeners((data) => {
      if (data.screen === 'challenge' && data.challengeId) {
        router.push(`/challenge/${data.challengeId}`);
      } else if (data.screen === 'friends') {
        router.push('/(tabs)/friends');
      } else if (data.screen === 'achievements') {
        router.push('/(tabs)/achievements');
      }
    });

    // Handle tap on notification when app was killed
    getInitialNotification().then((data) => {
      if (!data) return;
      if (data.screen === 'challenge' && data.challengeId) {
        router.push(`/challenge/${data.challengeId}`);
      } else if (data.screen === 'friends') {
        router.push('/(tabs)/friends');
      } else if (data.screen === 'achievements') {
        router.push('/(tabs)/achievements');
      }
    }).catch(console.error);

    return () => {
      const socket = getSocket();
      socket?.off('achievement:earned');
      cleanupListeners();
      disconnectSocket();
    };
  }, [isAuthenticated, addPendingToast]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
