import { pool } from '../config/database';
import { todayInAppTimezone } from '../utils/date';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarId: number;
  stepCount: number;
  rank: number;
  isCurrentUser: boolean;
}

export async function getDailyLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  const today = todayInAppTimezone();

  const { rows } = await pool.query(
    `WITH friends AS (
       SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
       FROM friendships
       WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
       UNION SELECT $1::uuid
     )
     SELECT
       u.id AS "userId",
       u.username,
       u.avatar_id AS "avatarId",
       COALESCE(ds.step_count, 0) AS "stepCount",
       RANK() OVER (ORDER BY COALESCE(ds.step_count, 0) DESC)::int AS rank,
       u.id = $1 AS "isCurrentUser"
     FROM friends f
     JOIN users u ON u.id = f.friend_id
     LEFT JOIN daily_steps ds ON ds.user_id = u.id AND ds.step_date = $2
     ORDER BY rank ASC, u.username ASC`,
    [userId, today]
  );
  return rows;
}

export async function getWeeklyLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  // ISO week: Monday to today
  const { rows } = await pool.query(
    `WITH friends AS (
       SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
       FROM friendships
       WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
       UNION SELECT $1::uuid
     )
     SELECT
       u.id AS "userId",
       u.username,
       u.avatar_id AS "avatarId",
       COALESCE(SUM(ds.step_count), 0)::int AS "stepCount",
       RANK() OVER (ORDER BY COALESCE(SUM(ds.step_count), 0) DESC)::int AS rank,
       u.id = $1 AS "isCurrentUser"
     FROM friends f
     JOIN users u ON u.id = f.friend_id
     LEFT JOIN daily_steps ds ON ds.user_id = u.id
       AND ds.step_date >= date_trunc('week', CURRENT_DATE)
       AND ds.step_date <= CURRENT_DATE
     GROUP BY u.id, u.username, u.avatar_id
     ORDER BY rank ASC, u.username ASC`,
    [userId]
  );
  return rows;
}
