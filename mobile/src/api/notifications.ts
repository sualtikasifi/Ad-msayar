import { apiClient } from './client';

export interface NotificationPreferences {
  challenge_invite: boolean;
  friend_request: boolean;
  challenge_started: boolean;
  daily_reminder: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<NotificationPreferences>('/users/me/notification-preferences');
  return data;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data } = await apiClient.put<NotificationPreferences>(
    '/users/me/notification-preferences',
    prefs
  );
  return data;
}
