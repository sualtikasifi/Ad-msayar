import { useEffect, useRef, useState, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import { useStepsStore } from '../store/stepsStore';

const SYNC_INTERVAL_MS = 60 * 1000; // forced sync every 60s
const DEBOUNCE_MS = 500;

interface PedometerState {
  todaySteps: number;
  isAvailable: boolean;
  permissionGranted: boolean;
}

/**
 * Tracks today's steps using the device pedometer.
 *
 * Platform notes:
 * - iOS supports `getStepCountAsync` for historical (since-midnight) queries.
 * - Android does NOT support historical queries; only the live `watchStepCount`
 *   stream is available, and it requires the ACTIVITY_RECOGNITION runtime
 *   permission (Android 10+). Without requesting it, the sensor stays silent.
 *
 * The live stream reports steps since the subscription started, so we anchor it
 * to the count already known for today (server/store) and only ever increase the
 * displayed total — this avoids overwriting the server with a lower value.
 */
export function usePedometer(): PedometerState {
  const { todaySteps, setTodaySteps, syncToServer } = useStepsStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Live-stream anchoring (mainly for Android, where the stream is relative).
  const watchOriginRef = useRef<number | null>(null);
  const sessionBaseRef = useRef<number>(0);

  const scheduledSync = useCallback(
    (count: number) => {
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      pendingSyncRef.current = setTimeout(() => {
        syncToServer(count).catch(console.error);
      }, DEBOUNCE_MS);
    },
    [syncToServer]
  );

  useEffect(() => {
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let cancelled = false;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      setIsAvailable(available);
      if (!available) return;

      // 1) Request the runtime permission (ACTIVITY_RECOGNITION on Android,
      //    motion on iOS). Without this the sensor never emits on Android 10+.
      try {
        let perm = await Pedometer.getPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          perm = await Pedometer.requestPermissionsAsync();
        }
        if (cancelled) return;
        setPermissionGranted(perm.granted);
        if (!perm.granted) return;
      } catch {
        // Some platforms/SDKs don't implement the permission API — continue and
        // let watchStepCount fail gracefully if truly unavailable.
        setPermissionGranted(true);
      }

      // 2) iOS only: seed today's total from the historical query. On Android
      //    this throws, so we keep whatever is already in the store (server value).
      try {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const initial = await Pedometer.getStepCountAsync(midnight, new Date());
        if (cancelled) return;
        setTodaySteps(initial.steps);
        scheduledSync(initial.steps);
      } catch {
        /* Android: historical queries unsupported — rely on the live stream. */
      }

      // 3) Live updates. The stream reports steps since it began, so we anchor it
      //    to the count already known for today and only ever grow the total.
      subscription = Pedometer.watchStepCount((result) => {
        if (watchOriginRef.current === null) {
          watchOriginRef.current = result.steps;
          sessionBaseRef.current = useStepsStore.getState().todaySteps;
        }
        const delta = result.steps - watchOriginRef.current;
        const count = sessionBaseRef.current + Math.max(delta, 0);
        // Never let the displayed/synced total go down within a day.
        const safeCount = Math.max(count, useStepsStore.getState().todaySteps);
        setTodaySteps(safeCount);
        scheduledSync(safeCount);
      });

      // 4) Periodic forced sync. iOS can re-query an accurate absolute total;
      //    Android just re-syncs the latest known value.
      intervalRef.current = setInterval(async () => {
        try {
          const midnight = new Date();
          midnight.setHours(0, 0, 0, 0);
          const now = await Pedometer.getStepCountAsync(midnight, new Date());
          const safe = Math.max(now.steps, useStepsStore.getState().todaySteps);
          setTodaySteps(safe);
          syncToServer(safe).catch(console.error);
        } catch {
          const latest = useStepsStore.getState().todaySteps;
          if (latest > 0) syncToServer(latest).catch(console.error);
        }
      }, SYNC_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setTodaySteps, scheduledSync, syncToServer]);

  return { todaySteps, isAvailable, permissionGranted };
}
