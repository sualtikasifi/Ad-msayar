import { Server } from 'socket.io';
import { pool } from '../config/database';
import * as pushService from './push.service';
import { todayInAppTimezone } from '../utils/date';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  xp: number;
}

export interface UserAchievement extends Achievement {
  earned_at: Date;
}

// ─── Read helpers ──────────────────────────────────────────────────────────

export async function getAllAchievements(): Promise<Achievement[]> {
  const { rows } = await pool.query<Achievement>(
    `SELECT id, name, description, emoji, category, xp FROM achievements ORDER BY category, xp ASC`
  );
  return rows;
}

export async function getMyAchievements(userId: string): Promise<UserAchievement[]> {
  const { rows } = await pool.query<UserAchievement>(
    `SELECT a.id, a.name, a.description, a.emoji, a.category, a.xp, ua.earned_at
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY ua.earned_at DESC`,
    [userId]
  );
  return rows;
}

export async function getUserXp(userId: string): Promise<number> {
  const { rows } = await pool.query<{ total_xp: number }>(
    `SELECT total_xp FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0]?.total_xp ?? 0;
}

// ─── Award helper ──────────────────────────────────────────────────────────

/**
 * Awards an achievement if not already earned. Returns the achievement if newly awarded, null otherwise.
 */
async function award(
  userId: string,
  achievementId: string,
  io?: Server | null
): Promise<Achievement | null> {
  // Check if already earned
  const { rows: existing } = await pool.query(
    `SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`,
    [userId, achievementId]
  );
  if (existing.length > 0) return null;

  // Get achievement details
  const { rows: achRows } = await pool.query<Achievement>(
    `SELECT * FROM achievements WHERE id = $1`,
    [achievementId]
  );
  if (achRows.length === 0) return null;
  const achievement = achRows[0];

  // Insert and add XP in a transaction. Only credit XP if this call actually
  // won the insert — concurrent callers racing on the same achievement must
  // not both add XP once the unique constraint dedupes the row.
  const client = await pool.connect();
  let awarded = false;
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, achievementId]
    );
    awarded = (rowCount ?? 0) > 0;
    if (awarded) {
      await client.query(
        `UPDATE users SET total_xp = total_xp + $1 WHERE id = $2`,
        [achievement.xp, userId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  if (!awarded) return null;

  // Notify via socket
  if (io) {
    io.to(`user:${userId}`).emit('achievement:earned', { achievement });
  }

  // Push notification (fire-and-forget)
  pushService.notifyAchievementEarned(userId, achievement.name, achievement.emoji, achievement.xp).catch(console.error);

  console.log(`🏅 [Achievement] ${userId} earned: ${achievementId}`);
  return achievement;
}

// ─── Check functions ───────────────────────────────────────────────────────

/**
 * Called after every step sync. Checks step-based and streak-based achievements.
 */
export async function checkStepAchievements(
  userId: string,
  todayStepCount: number,
  io?: Server | null
): Promise<Achievement[]> {
  const earned: Achievement[] = [];

  // --- Daily step milestones ---
  const stepMilestones: [number, string][] = [
    [1,     'first_step'],
    [1000,  'steps_1k'],
    [5000,  'steps_5k'],
    [10000, 'steps_10k'],
    [20000, 'steps_20k'],
  ];

  for (const [threshold, id] of stepMilestones) {
    if (todayStepCount >= threshold) {
      const a = await award(userId, id, io);
      if (a) earned.push(a);
    }
  }

  // --- Total cumulative steps ---
  const { rows: totRows } = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(step_count), 0) AS total FROM daily_steps WHERE user_id = $1`,
    [userId]
  );
  const totalSteps = parseInt(totRows[0].total);

  const totalMilestones: [number, string][] = [
    [50000,   'total_50k'],
    [100000,  'total_100k'],
    [500000,  'total_500k'],
    [1000000, 'total_1m'],
  ];

  for (const [threshold, id] of totalMilestones) {
    if (totalSteps >= threshold) {
      const a = await award(userId, id, io);
      if (a) earned.push(a);
    }
  }

  // --- Streak ---
  const streakAchievements = await checkStreakAchievements(userId, io);
  earned.push(...streakAchievements);

  return earned;
}

async function checkStreakAchievements(
  userId: string,
  io?: Server | null
): Promise<Achievement[]> {
  const earned: Achievement[] = [];

  // Calculate current streak: consecutive days ending today with step_count > 0
  const { rows } = await pool.query<{ step_date: string; step_count: number }>(
    `SELECT step_date::text, step_count
     FROM daily_steps
     WHERE user_id = $1 AND step_count > 0
     ORDER BY step_date DESC
     LIMIT 120`,
    [userId]
  );

  if (rows.length === 0) return earned;

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

  const streakMilestones: [number, string][] = [
    [3,   'streak_3'],
    [7,   'streak_7'],
    [14,  'streak_14'],
    [30,  'streak_30'],
    [100, 'streak_100'],
  ];

  for (const [threshold, id] of streakMilestones) {
    if (streak >= threshold) {
      const a = await award(userId, id, io);
      if (a) earned.push(a);
    }
  }

  return earned;
}

/**
 * Called after a friend request is accepted (from either side).
 */
export async function checkFriendAchievements(
  userId: string,
  io?: Server | null
): Promise<Achievement[]> {
  const earned: Achievement[] = [];

  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM friendships
     WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'`,
    [userId]
  );
  const friendCount = parseInt(rows[0].count);

  const milestones: [number, string][] = [
    [1,  'first_friend'],
    [5,  'friends_5'],
    [10, 'friends_10'],
  ];

  for (const [threshold, id] of milestones) {
    if (friendCount >= threshold) {
      const a = await award(userId, id, io);
      if (a) earned.push(a);
    }
  }

  return earned;
}

/**
 * Called after a challenge is completed. Awards challenge-based achievements to winners.
 */
export async function checkChallengeAchievements(
  userId: string,
  challengeId: string,
  isWinner: boolean,
  challengeType: '1v1' | 'group',
  io?: Server | null
): Promise<Achievement[]> {
  const earned: Achievement[] = [];

  // First challenge participation
  const { rows: partRows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM challenge_participants cp
     JOIN challenges c ON c.id = cp.challenge_id
     WHERE cp.user_id = $1 AND cp.status = 'accepted'`,
    [userId]
  );
  if (parseInt(partRows[0].count) >= 1) {
    const a = await award(userId, 'first_challenge', io);
    if (a) earned.push(a);
  }

  if (!isWinner) return earned;

  // Win-based achievements
  const { rows: winRows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM challenge_participants cp
     JOIN challenges c ON c.id = cp.challenge_id
     WHERE cp.user_id = $1 AND cp.rank = 1 AND c.status = 'completed'`,
    [userId]
  );
  const wins = parseInt(winRows[0].count);

  const winMilestones: [number, string][] = [
    [1,  'first_win'],
    [3,  'wins_3'],
    [5,  'wins_5'],
    [10, 'wins_10'],
  ];

  for (const [threshold, id] of winMilestones) {
    if (wins >= threshold) {
      const a = await award(userId, id, io);
      if (a) earned.push(a);
    }
  }

  // Group win
  if (challengeType === 'group') {
    const a = await award(userId, 'group_win', io);
    if (a) earned.push(a);
  }

  // Comeback: won despite being behind at some point
  // We check if winner had rank > 1 at any time during the challenge (simplified: check if any opponent had more steps at midpoint)
  const { rows: challRows } = await pool.query(
    `SELECT start_date, end_date FROM challenges WHERE id = $1`,
    [challengeId]
  );
  if (challRows.length > 0) {
    const { start_date, end_date } = challRows[0];
    const startD = new Date(start_date);
    const endD = new Date(end_date);
    const midD = new Date((startD.getTime() + endD.getTime()) / 2);
    const midDate = midD.toISOString().split('T')[0];

    // Check if any other participant had more steps than winner at midpoint
    const { rows: midRows } = await pool.query(
      `SELECT cp.user_id, COALESCE(SUM(ds.step_count), 0) AS steps
       FROM challenge_participants cp
       LEFT JOIN daily_steps ds ON ds.user_id = cp.user_id
         AND ds.step_date BETWEEN $2 AND $3
       WHERE cp.challenge_id = $1 AND cp.status = 'accepted' AND cp.user_id != $4
       GROUP BY cp.user_id`,
      [challengeId, start_date, midDate, userId]
    );
    const { rows: myMidRows } = await pool.query(
      `SELECT COALESCE(SUM(step_count), 0) AS steps
       FROM daily_steps
       WHERE user_id = $1 AND step_date BETWEEN $2 AND $3`,
      [userId, start_date, midDate]
    );
    const myMidSteps = parseInt(myMidRows[0]?.steps ?? '0');
    const wasBehin = midRows.some((r) => parseInt(r.steps) > myMidSteps);
    if (wasBehin) {
      const a = await award(userId, 'comeback', io);
      if (a) earned.push(a);
    }
  }

  return earned;
}
