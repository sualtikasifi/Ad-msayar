import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { today } from '../utils/dateHelpers';

// Local (on-device, no server round-trip) reminder scheduled a few hours
// after the pedometer permission is found denied, nudging the user to grant
// it. Deliberately independent of the backend push notification system —
// this fires even if the user has never registered a push token.
const REMINDER_DELAY_SECONDS = 3 * 60 * 60; // 3 hours

// Tracks the calendar day this reminder was last scheduled for (so at most
// one reminder is scheduled per day, even though `schedulePermissionReminderIfNeeded`
// is safe to call on every foreground recheck) and the notification id (so
// it can be cancelled once permission is actually granted).
const SCHEDULED_DATE_KEY = 'permissionReminderScheduledDate';
const NOTIFICATION_ID_KEY = 'permissionReminderNotificationId';

/**
 * Schedules a single local reminder notification if the pedometer permission
 * is currently denied and no reminder has been scheduled yet today.
 */
export async function schedulePermissionReminderIfNeeded(): Promise<void> {
  try {
    const scheduledDate = await SecureStore.getItemAsync(SCHEDULED_DATE_KEY);
    if (scheduledDate === today()) return; // already scheduled today

    // The previous reminder (if any) was scheduled with a relative delay, so
    // it may still be pending past a midnight rollover — the date check
    // above alone can't catch that (today() has already moved on), which
    // would otherwise leave the old notification both un-cancellable and
    // duplicated by this new one. Always clear it first; cancelling an
    // already-fired or nonexistent id is a harmless no-op.
    const previousId = await SecureStore.getItemAsync(NOTIFICATION_ID_KEY);
    if (previousId) {
      await Notifications.cancelScheduledNotificationAsync(previousId).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '👟 Adımların sayılmıyor',
        body: 'İzin vermek için dokun',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_SECONDS,
      },
    });

    await SecureStore.setItemAsync(SCHEDULED_DATE_KEY, today());
    await SecureStore.setItemAsync(NOTIFICATION_ID_KEY, id);
  } catch {
    // Local scheduling failing shouldn't break the rest of the app.
  }
}

/**
 * Cancels a pending permission reminder (if any). Called once the pedometer
 * permission is actually granted, so the user isn't nagged after already
 * fixing it.
 */
export async function cancelPermissionReminder(): Promise<void> {
  try {
    const id = await SecureStore.getItemAsync(NOTIFICATION_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await SecureStore.deleteItemAsync(NOTIFICATION_ID_KEY);
    }
    await SecureStore.deleteItemAsync(SCHEDULED_DATE_KEY);
  } catch {
    // Best-effort cleanup — a stale scheduled id is harmless.
  }
}
