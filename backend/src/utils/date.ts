// Users are in Turkey (UTC+3, no DST since 2016), but step_date values are
// written using the device's local calendar day. Comparing against the
// server's UTC date is off by a day for part of the evening/night — this
// computes "today" in the app's fixed timezone instead.
const APP_TZ_OFFSET_HOURS = 3;

export function todayInAppTimezone(): string {
  const shifted = new Date(Date.now() + APP_TZ_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().split('T')[0];
}
