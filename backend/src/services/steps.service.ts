import { pool } from '../config/database';
import { todayInAppTimezone } from '../utils/date';
import type { DailySteps } from '../types';

export async function syncSteps(
  userId: string,
  stepDate: string,
  stepCount: number
): Promise<DailySteps> {
  const { rows } = await pool.query<DailySteps>(
    `INSERT INTO daily_steps (user_id, step_date, step_count, synced_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, step_date)
     -- Steps only ever grow during a day; never let a stale/lower sync (race
     -- between foreground & background, multiple devices) overwrite a higher count.
     DO UPDATE SET step_count = GREATEST(daily_steps.step_count, EXCLUDED.step_count), synced_at = NOW()
     RETURNING *`,
    [userId, stepDate, stepCount]
  );
  return rows[0];
}

export async function getTodaySteps(userId: string): Promise<number> {
  const today = todayInAppTimezone();
  const { rows } = await pool.query<{ step_count: number }>(
    `SELECT step_count FROM daily_steps WHERE user_id = $1 AND step_date = $2`,
    [userId, today]
  );
  return rows[0]?.step_count ?? 0;
}

export async function getStepsRange(
  userId: string,
  from: string,
  to: string
): Promise<DailySteps[]> {
  const { rows } = await pool.query<DailySteps>(
    `SELECT * FROM daily_steps
     WHERE user_id = $1 AND step_date BETWEEN $2 AND $3
     ORDER BY step_date ASC`,
    [userId, from, to]
  );
  return rows;
}

export async function getUserStepsRange(
  requesterId: string,
  targetUserId: string,
  from: string,
  to: string
): Promise<DailySteps[]> {
  // Only friends can see each other's steps
  const { rows: friendRows } = await pool.query(
    `SELECT id FROM friendships
     WHERE status = 'accepted'
     AND (
       (requester_id = $1 AND addressee_id = $2) OR
       (requester_id = $2 AND addressee_id = $1)
     )`,
    [requesterId, targetUserId]
  );

  if (friendRows.length === 0 && requesterId !== targetUserId) {
    throw new Error('NOT_FRIENDS');
  }

  return getStepsRange(targetUserId, from, to);
}
