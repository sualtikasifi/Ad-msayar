import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as SecureStore from 'expo-secure-store';
import { Pedometer } from 'expo-sensors';

export const BACKGROUND_STEP_TASK = 'BACKGROUND_STEP_SYNC';

// This task fires on background fetch (every ~15 minutes minimum on iOS)
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    // Read pedometer from midnight
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    if (!isPedometerAvailable) return BackgroundFetch.BackgroundFetchResult.NoData;

    const result = await Pedometer.getStepCountAsync(midnight, new Date());
    const stepCount = result.steps;

    const today = new Date().toISOString().split('T')[0];

    // Store locally first
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
