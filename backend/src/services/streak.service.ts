import { pool } from '../config/database';
import { todayInAppTimezone } from '../utils/date';

/**
 * Calculates a user's current daily-steps streak: consecutive days (ending
 * today or yesterday, so a streak stays "alive" until the user misses a full
 * day) with step_count > 0.
 *
 * Kept in its own module (rather than inside `achievement.service.ts`, where
 * this logic originated) so both `achievement.service.ts` (streak
 * achievements) and `push.service.ts` (streak-at-risk daily reminder) can
 * import it without creating a circular dependency between those two.
 */
export async function computeCurrentStreak(userId: string): Promise<number> {
  const { rows } = await pool.query<{ step_date: string; step_count: number }>(
    `SELECT step_date::text, step_count
     FROM daily_steps
     WHERE user_id = $1 AND step_count > 0
     ORDER BY step_date DESC
     LIMIT 120`,
    [userId]
  );

  if (rows.length === 0) return 0;

  let streak = 0;
  // Anchor on the app's fixed UTC+3 "today" (matching how step_date rows are
  // bucketed), not the server process's local/UTC "today" — otherwise, during
  // the evening hours in Turkey (still "yesterday" in UTC), today's
  // already-synced steps look like they're from "tomorrow" relative to the
  // server clock and the streak breaks immediately (diffDays goes negative).
  let current = new Date(todayInAppTimezone());

  for (const row of rows) {
    const rowDate = new Date(row.step_date);
    const diffDays = Math.round((current.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      current = rowDate;
    } else {
      break;
    }
  }

  return streak;
}
