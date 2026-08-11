import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useStepsStore } from '@/store/stepsStore';
import { useChallengeStore } from '@/store/challengeStore';
import { useAuthStore } from '@/store/authStore';

const CHANNEL_ID = 'live-steps';
const NOTIFICATION_ID = 'live-step-counter';

/**
 * Keeps a persistent, silent Android notification updated with today's step
 * count (and the leading active challenge's progress, if any), so the user
 * can check their steps from the notification shade without opening the app.
 *
 * iOS has no equivalent always-on notification-shade concept, so this is a
 * no-op there.
 */
export function useLiveStepNotification() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const todaySteps = useStepsStore((s) => s.todaySteps);
  const challenges = useChallengeStore((s) => s.challenges);
  const lastBodyRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Canlı Adım Sayacı',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (!isAuthenticated) {
      Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {});
      lastBodyRef.current = null;
      return;
    }

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const activeChallenge = challenges.find((c) => c.status === 'active');
      const stepsText = `${todaySteps.toLocaleString('tr-TR')} adım`;
      const body = activeChallenge
        ? `${stepsText} · ${activeChallenge.title || (activeChallenge.type === '1v1' ? '1v1 Challenge' : 'Grup Challenge')}: ${(activeChallenge.my_steps ?? 0).toLocaleString('tr-TR')} adım`
        : stepsText;

      if (lastBodyRef.current === body) return;
      lastBodyRef.current = body;

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
          title: '👟 Bugünkü Adımların',
          body,
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
          data: { screen: 'home' },
        },
        trigger: { channelId: CHANNEL_ID },
      }).catch(() => {});
    })();
  }, [todaySteps, challenges, isAuthenticated]);
}
