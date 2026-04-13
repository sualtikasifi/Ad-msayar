import { useEffect, useRef, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import { useStepsStore } from '../store/stepsStore';

const SYNC_INTERVAL_MS = 60 * 1000; // sync every 60s
const DEBOUNCE_MS = 500;

export function usePedometer(): { todaySteps: number; isAvailable: boolean } {
  const { todaySteps, setTodaySteps, syncToServer } = useStepsStore();
  const isAvailableRef = useRef(false);
  const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    (async () => {
      const available = await Pedometer.isAvailableAsync();
      isAvailableRef.current = available;
      if (!available) return;

      // Get steps from midnight for initial count
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const initial = await Pedometer.getStepCountAsync(midnight, new Date());
      setTodaySteps(initial.steps);
      scheduledSync(initial.steps);

      // Watch ongoing steps
      subscription = Pedometer.watchStepCount((result) => {
        const count = result.steps + (initial?.steps ?? 0);
        setTodaySteps(count);
        scheduledSync(count);
      });

      // Forced sync every 60 seconds
      intervalRef.current = setInterval(async () => {
        const now = await Pedometer.getStepCountAsync(midnight, new Date());
        setTodaySteps(now.steps);
        syncToServer(now.steps).catch(console.error);
      }, SYNC_INTERVAL_MS);
    })();

    return () => {
      subscription?.remove();
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setTodaySteps, scheduledSync, syncToServer]);

  return { todaySteps, isAvailable: isAvailableRef.current };
}
