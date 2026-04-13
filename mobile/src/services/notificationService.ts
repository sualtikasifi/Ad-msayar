import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

// Configure how notifications appear while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save token to backend
  try {
    await apiClient.post('/push/token', { token });
  } catch (err) {
    console.error('Failed to save push token:', err);
  }

  return token;
}

export type NotificationData = {
  screen?: string;
  challengeId?: string;
  tab?: string;
};

export function setupNotificationListeners(
  onNotification: (data: NotificationData) => void
): () => void {
  // Foreground notification received
  const sub1 = Notifications.addNotificationReceivedListener(() => {
    // Foreground: toast is handled by socket — no extra UI needed
  });

  // Notification tapped (background/killed → navigate)
  const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData;
    if (data) onNotification(data);
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}

// Handle notification tap when app was killed
export async function getInitialNotification(): Promise<NotificationData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return response.notification.request.content.data as NotificationData;
}
