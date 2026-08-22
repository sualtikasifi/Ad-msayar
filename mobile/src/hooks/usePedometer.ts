import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useStepsStore } from '../store/stepsStore';
import { schedulePermissionReminderIfNeeded, cancelPermissionReminder } from '../services/permissionReminder';

const SYNC_INTERVAL_MS = 60 * 1000; // forced sync every 60s
const DEBOUNCE_MS = 500;

interface PedometerState {
  todaySteps: number;
  isAvailable: boolean;
  permissionGranted: boolean;
  // Flips true once the initial availability/permission check has resolved,
  // so callers can distinguish "still checking" (both flags start false)
  // from a real denial/unavailable-sensor state worth surfacing to the user.
  checked: boolean;
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
  const { todaySteps, setTodaySteps, syncToServer, loadTodayFromServer } = useStepsStore();
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checked, setChecked] = useState(false);

  const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Live-stream anchoring (mainly for Android, where the stream is relative).
  const watchOriginRef = useRef<number | null>(null);
  const sessionBaseRef = useRef<number>(0);
  // Holds the live watchStepCount subscription so it survives re-renders and is
  // only ever removed on real unmount.
  const pedometerSubRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  // Guards against two overlapping setup runs (e.g. mount + an immediate
  // foreground event) racing to create two subscriptions. Held for good once
  // setup finishes or is known to be unrecoverable; released again on any
  // outcome that a later retry could still fix.
  const settingUpRef = useRef(false);
  const unmountedRef = useRef(false);

  const scheduledSync = useCallback(
    (count: number) => {
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      pendingSyncRef.current = setTimeout(() => {
        syncToServer(count).catch(console.error);
      }, DEBOUNCE_MS);
    },
    [syncToServer]
  );

  /**
   * Idempotent sensor setup. Safe to call repeatedly (on mount and on every
   * return to the foreground): it no-ops while a run is in flight and once a
   * run has succeeded.
   *
   * Deliberately NOT driven by an effect's dependency array. A previous
   * version re-ran the whole setup effect on a `recheckTrigger` state bump and
   * aborted the in-flight run via a `cancelled` flag captured in the effect
   * cleanup. That deadlocked the sensor: requesting the runtime permission
   * opens a system dialog, which backgrounds the app, so granting it fires
   * AppState 'active' *while setup is still awaiting* — the cleanup cancelled
   * the in-flight run, and the re-run bailed out immediately because the setup
   * lock was already held. `watchStepCount` was then never subscribed and the
   * lock was never released, so steps silently stopped counting for the whole
   * session. Calling this function directly keeps in-flight work alive.
   */
  const setupPedometer = useCallback(async () => {
    if (settingUpRef.current || unmountedRef.current) return;
    settingUpRef.current = true;

    // Only keep the lock for outcomes a retry can't improve on: a completed
    // setup, a device with no sensor, or a permanently denied permission.
    let keepLock = false;

    try {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (unmountedRef.current) return;
      setIsAvailable(available);
      setChecked(true);
      if (!available) {
        keepLock = true;
        return;
      }

      // 1) Request the runtime permission (ACTIVITY_RECOGNITION on Android,
      //    motion on iOS). Without this the sensor never emits on Android 10+.
      try {
        let perm = await Pedometer.getPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          perm = await Pedometer.requestPermissionsAsync();
        }
        if (unmountedRef.current) return;
        setPermissionGranted(perm.granted);
        if (!perm.granted) {
          // Permanently denied ("don't ask again") can only be undone from the
          // OS settings screen — hold the lock so we don't re-prompt on every
          // foreground. Otherwise release it so the next return retries.
          keepLock = !perm.canAskAgain;
          return;
        }
      } catch {
        // Some platforms/SDKs don't implement the permission API — continue and
        // let watchStepCount fail gracefully if truly unavailable.
        setPermissionGranted(true);
      }

      // 2) Hydrate today's authoritative total from the server BEFORE anchoring
      //    the live stream. Without this, watchStepCount's first event can
      //    capture a stale (e.g. 0) baseline while a concurrent server load
      //    resolves later with a higher value — every subsequent live delta
      //    then gets clamped below that higher value and the display freezes.
      try {
        await loadTodayFromServer();
      } catch {
        /* offline or first run — keep whatever is already in the store. */
      }
      if (unmountedRef.current) return;

      // 3) iOS only: seed today's total from the historical query. On Android
      //    this throws, so we keep whatever is already in the store (server value).
      try {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const initial = await Pedometer.getStepCountAsync(midnight, new Date());
        if (unmountedRef.current) return;
        setTodaySteps(initial.steps);
        scheduledSync(initial.steps);
      } catch {
        /* Android: historical queries unsupported — rely on the live stream. */
      }

      if (unmountedRef.current) return;

      // 4) Live updates. The stream reports steps since it began, so we anchor it
      //    to the count already known for today and only ever grow the total.
      const subscription = Pedometer.watchStepCount((result) => {
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

      // Unmounted while subscribing — the teardown effect has already run, so
      // clean up here instead of leaking a live native listener.
      if (unmountedRef.current) {
        subscription.remove();
        return;
      }
      pedometerSubRef.current = subscription;

      // 5) Periodic forced sync. iOS can re-query an accurate absolute total;
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

      keepLock = true; // fully set up — later calls are no-ops
    } finally {
      if (!keepLock) settingUpRef.current = false;
    }
  }, [setTodaySteps, scheduledSync, syncToServer, loadTodayFromServer]);

  useEffect(() => {
    unmountedRef.current = false;
    setupPedometer().catch(() => {});
  }, [setupPedometer]);

  // Retry setup whenever the app returns to the foreground. This covers the
  // flow: permission denied -> user taps the "Ayarlar'ı aç" banner -> grants
  // it in Settings -> comes back. It is a plain call (not an effect re-run),
  // so it can never abort a setup that is still in flight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setupPedometer().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [setupPedometer]);

  // Once the permission check has resolved, keep a local (on-device) reminder
  // notification in sync with the current denial/grant state: schedule one if
  // denied (at most once per day — see permissionReminder.ts), or cancel any
  // pending one the moment permission is granted (e.g. via the in-app banner
  // -> OS Settings -> back-to-app flow above) so the user isn't nagged after
  // already fixing it. Only relevant when the sensor actually exists — on a
  // device with no pedometer, permissionGranted never becomes true, so
  // without this guard we'd schedule an unfixable "grant permission" nudge
  // (and never be able to cancel it).
  useEffect(() => {
    if (!checked) return;
    if (!isAvailable || permissionGranted) {
      cancelPermissionReminder().catch(() => {});
    } else {
      schedulePermissionReminderIfNeeded().catch(() => {});
    }
  }, [checked, isAvailable, permissionGranted]);

  // Real teardown (component unmount) only — removes the live subscription,
  // pending debounce and periodic sync interval.
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      pedometerSubRef.current?.remove();
      pedometerSubRef.current = null;
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { todaySteps, isAvailable, permissionGranted, checked };
}
