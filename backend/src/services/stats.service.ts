import { pool } from '../config/database';

export interface DailyPoint {
  date: string;
  steps: number;
}

export interface WeeklyPoint {
  week_start: string;
  total_steps: number;
  avg_daily: number;
  active_days: number;
}

export interface PersonalRecords {
  best_day_steps: number;
  best_day_date: string | null;
  current_streak: number;
  longest_streak: number;
  total_steps_all_time: number;
  active_days_total: number;
  avg_daily_steps_30d: number;
}

export interface MonthlyHeatmapPoint {
  date: string;
  steps: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0=none, 4=max
}

// ─── Last N days bar chart data ───────────────────────────────────────────

export async function getLast30Days(userId: string): Promise<DailyPoint[]> {
  // Returns one row per day for last 30 days, filling 0 for missing days
  const { rows } = await pool.query(
    `SELECT
       gs.day::date::text AS date,
       COALESCE(ds.step_count, 0) AS steps
     FROM generate_series(
       CURRENT_DATE - INTERVAL '29 days',
       CURRENT_DATE,
       '1 day'
     ) AS gs(day)
     LEFT JOIN daily_steps ds
       ON ds.user_id = $1 AND ds.step_date = gs.day::date
     ORDER BY gs.day ASC`,
    [userId]
  );
  return rows;
}

export async function getLast7Days(userId: string): Promise<DailyPoint[]> {
  const { rows } = await pool.query(
    `SELECT
       gs.day::date::text AS date,
       COALESCE(ds.step_count, 0) AS steps
     FROM generate_series(
       CURRENT_DATE - INTERVAL '6 days',
       CURRENT_DATE,
       '1 day'
     ) AS gs(day)
     LEFT JOIN daily_steps ds
       ON ds.user_id = $1 AND ds.step_date = gs.day::date
     ORDER BY gs.day ASC`,
    [userId]
  );
  return rows;
}

// ─── Weekly aggregates ────────────────────────────────────────────────────

export async function getLast12Weeks(userId: string): Promise<WeeklyPoint[]> {
  const { rows } = await pool.query(
    `SELECT
       date_trunc('week', gs.week)::date::text AS week_start,
       COALESCE(SUM(ds.step_count), 0)::int  AS total_steps,
       ROUND(COALESCE(AVG(CASE WHEN ds.step_count > 0 THEN ds.step_count END), 0))::int AS avg_daily,
       COUNT(CASE WHEN ds.step_count > 0 THEN 1 END)::int AS active_days
     FROM generate_series(
       date_trunc('week', CURRENT_DATE) - INTERVAL '11 weeks',
       date_trunc('week', CURRENT_DATE),
       '1 week'
     ) AS gs(week)
     LEFT JOIN daily_steps ds
       ON ds.user_id = $1
       AND ds.step_date >= gs.week::date
       AND ds.step_date < (gs.week + INTERVAL '7 days')::date
     GROUP BY gs.week
     ORDER BY gs.week ASC`,
    [userId]
  );
  return rows;
}

// ─── Personal records ────────────────────────────────────────────────────

export async function getPersonalRecords(userId: string): Promise<PersonalRecords> {
  // Best single day
  const { rows: bestRows } = await pool.query<{ step_count: number; step_date: string }>(
    `SELECT step_count, step_date::text FROM daily_steps
     WHERE user_id = $1 ORDER BY step_count DESC LIMIT 1`,
    [userId]
  );

  // Total & active days
  const { rows: totRows } = await pool.query<{
    total: string; active_days: string; avg_30d: string;
  }>(
    `SELECT
       COALESCE(SUM(step_count), 0)::text AS total,
       COUNT(*)::text AS active_days,
       ROUND(COALESCE(AVG(CASE WHEN step_date >= CURRENT_DATE - 29 THEN step_count END), 0))::text AS avg_30d
     FROM daily_steps WHERE user_id = $1`,
    [userId]
  );

  // Current streak
  const { rows: streakRows } = await pool.query<{ step_date: string; step_count: number }>(
    `SELECT step_date::text, step_count FROM daily_steps
     WHERE user_id = $1 AND step_count > 0
     ORDER BY step_date DESC LIMIT 120`,
    [userId]
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const row of streakRows) {
    const d = new Date(row.step_date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
      if (currentStreak === 0 && diff <= 1) currentStreak = tempStreak;
      cursor = d;
    } else {
      if (currentStreak === 0) currentStreak = tempStreak;
      tempStreak = 1;
      cursor = d;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    best_day_steps:    bestRows[0]?.step_count ?? 0,
    best_day_date:     bestRows[0]?.step_date ?? null,
    current_streak:    currentStreak,
    longest_streak:    longestStreak,
    total_steps_all_time: parseInt(totRows[0]?.total ?? '0'),
    active_days_total:    parseInt(totRows[0]?.active_days ?? '0'),
    avg_daily_steps_30d:  parseInt(totRows[0]?.avg_30d ?? '0'),
  };
}

// ─── Monthly heatmap ────────────────────────────────────────────────────

export async function getMonthHeatmap(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyHeatmapPoint[]> {
  const { rows } = await pool.query<{ step_date: string; step_count: number }>(
    `SELECT step_date::text, step_count FROM daily_steps
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM step_date) = $2
       AND EXTRACT(MONTH FROM step_date) = $3
     ORDER BY step_date ASC`,
    [userId, year, month]
  );

  // Find max this month for intensity calculation
  const max = rows.reduce((m, r) => Math.max(m, r.step_count), 1);

  return rows.map((r) => {
    const ratio = r.step_count / max;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (r.step_count === 0) intensity = 0;
    else if (ratio < 0.25) intensity = 1;
    else if (ratio < 0.5)  intensity = 2;
    else if (ratio < 0.75) intensity = 3;
    else                   intensity = 4;

    return { date: r.step_date, steps: r.step_count, intensity };
  });
}
