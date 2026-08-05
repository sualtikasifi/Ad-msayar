import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as SecureStore from 'expo-secure-store';
import { Pedometer } from 'expo-sensors';
import { today as todayLocalDate } from '../utils/dateHelpers';

export const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_SYNC';

// This task fires on background fetch (every ~15 minutes minimum on iOS).
//
// `Pedometer.getStepCountAsync` (historical since-midnight query) is iOS-only —
// on Android it always throws, so this task can only ever push the most recent
// value already recorded locally (from the foreground `watchStepCount` stream)
// rather than query the sensor itself. See usePedometer.ts for the anchoring
// logic that produces `lastKnownSteps`.
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    const today = todayLocalDate();
    let stepCount: number;

    if (Platform.OS === 'ios') {
      const isPedometerAvailable = await Pedometer.isAvailableAsync();
      if (!isPedometerAvailable) return BackgroundFetch.BackgroundFetchResult.NoData;

      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const result = await Pedometer.getStepCountAsync(midnight, new Date());
      stepCount = result.steps;
    } else {
      // Android: no historical query API. Re-push the last value the
      // foreground stream recorded instead of re-querying the sensor.
      const stored = await SecureStore.getItemAsync('lastKnownSteps');
      if (!stored) return BackgroundFetch.BackgroundFetchResult.NoData;
      const parsed = JSON.parse(stored) as { date: string; count: number };
      if (parsed.date !== today) return BackgroundFetch.BackgroundFetchResult.NoData;
      stepCount = parsed.count;
    }

    // Store latest step count locally for widget and offline use
    await SecureStore.setItemAsync('lastKnownSteps', JSON.stringify({ date: today, count: stepCount }));

    // Try to sync via API
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (!accessToken) return BackgroundFetch.BackgroundFetchResult.NoData;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const response = await fetch(`${apiUrl}/steps/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ step_date: today, step_count: stepCount }),
    });

    if (response.ok) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Task may already be registered
  }
}

export async function unregisterBackgroundTask(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_STEP_TASK).catch(() => {});
}
