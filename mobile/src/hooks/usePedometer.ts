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
  // Bumped whenever the app returns to the foreground, so the main effect
  // below re-runs its permission/availability check and (re)establishes the
  // watchStepCount subscription if the user just granted the permission from
  // the OS Settings screen. There is no other AppState listener in the app.
  const [recheckTrigger, setRecheckTrigger] = useState(0);

  const pendingSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Live-stream anchoring (mainly for Android, where the stream is relative).
  const watchOriginRef = useRef<number | null>(null);
  const sessionBaseRef = useRef<number>(0);
  // Holds the live watchStepCount subscription across re-renders/re-runs of
  // the setup effect below, so it isn't torn down just because the effect
  // re-ran (e.g. on a foreground recheck) — only real unmount removes it.
  const pedometerSubRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  // True once sensor setup has actually completed (subscription established,
  // or the sensor was found permanently unavailable). While permission is
  // still denied this stays false, so the next foreground recheck retries.
  const initializedRef = useRef(false);

  const scheduledSync = useCallback(
    (count: number) => {
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      pendingSyncRef.current = setTimeout(() => {
        syncToServer(count).catch(console.error);
      }, DEBOUNCE_MS);
    },
    [syncToServer]
  );

  // Re-check permission/availability whenever the app comes back to the
  // foreground. This covers the flow: permission denied -> user taps the
  // "Ayarlar'ı aç" banner -> grants permission in Settings -> returns to the
  // app. Without this, `checked`/`permissionGranted`/`isAvailable` would only
  // ever be computed once at mount, and the watchStepCount subscription
  // (skipped on the initial denial) would never be established until the
  // app was fully restarted.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setRecheckTrigger((n) => n + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Sensor setup already completed (subscribed, or permanently
    // unavailable) — the foreground recheck that re-ran this effect doesn't
    // need to redo any work, and must NOT tear down the live subscription
    // (it lives in pedometerSubRef, not in this effect's own cleanup).
    if (initializedRef.current) return;

    // Grab the setup lock synchronously, before any async work starts. If the
    // app foregrounds twice in quick succession (AppState 'active' firing
    // more than once before the first run has a chance to flip this ref at
    // its natural completion point), this prevents a second overlapping run
    // from ever starting a second `watchStepCount` subscription (which would
    // overwrite `pedometerSubRef` and leak the first, un-removed listener).
    // Failure paths below that should be retried on the next foreground
    // recheck (sensor check itself failing, or permission still deniable)
    // explicitly release this lock again.
    initializedRef.current = true;

    let cancelled = false;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      setIsAvailable(available);
      if (!available) {
        setChecked(true);
        initializedRef.current = true;
        return;
      }

      // 1) Request the runtime permission (ACTIVITY_RECOGNITION on Android,
      //    motion on iOS). Without this the sensor never emits on Android 10+.
      try {
        let perm = await Pedometer.getPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          perm = await Pedometer.requestPermissionsAsync();
        }
        if (cancelled) return;
        setPermissionGranted(perm.granted);
        setChecked(true);
        if (!perm.granted) {
          if (perm.canAskAgain) {
            // Still deniable — release the lock so the next foreground
            // recheck retries the permission prompt/check.
            initializedRef.current = false;
          }
          // canAskAgain === false: the user permanently denied the
          // permission ("don't ask again"). Keep the lock held so we don't
          // pointlessly re-run `getPermissionsAsync()` on every subsequent
          // foreground return — the OS itself never changes this back, the
          // user has to grant it from Settings, and the app would need a
          // fresh mount to pick that up in this state.
          return;
        }
      } catch {
        // Some platforms/SDKs don't implement the permission API — continue and
        // let watchStepCount fail gracefully if truly unavailable.
        setPermissionGranted(true);
        setChecked(true);
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
      if (cancelled) return;

      // 3) iOS only: seed today's total from the historical query. On Android
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

      // 4) Live updates. The stream reports steps since it began, so we anchor it
      //    to the count already known for today and only ever grow the total.
      pedometerSubRef.current = Pedometer.watchStepCount((result) => {
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

      // Setup fully succeeded — subsequent foreground rechecks are no-ops.
      initializedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [recheckTrigger, setTodaySteps, scheduledSync, syncToServer, loadTodayFromServer]);

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
    if (!isAvailable) {
      cancelPermissionReminder().catch(() => {});
      return;
    }
    if (permissionGranted) {
      cancelPermissionReminder().catch(() => {});
    } else {
      schedulePermissionReminderIfNeeded().catch(() => {});
    }
  }, [checked, isAvailable, permissionGranted]);

  // Real teardown (component unmount) only — removes the live subscription,
  // pending debounce and periodic sync interval. This is intentionally kept
  // separate from the setup effect above so that a foreground recheck (which
  // re-runs the setup effect but no-ops once initialized) never tears down
  // an already-working subscription.
  useEffect(() => {
    return () => {
      pedometerSubRef.current?.remove();
      if (pendingSyncRef.current) clearTimeout(pendingSyncRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { todaySteps, isAvailable, permissionGranted, checked };
}
