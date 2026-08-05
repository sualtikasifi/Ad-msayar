import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { AVATAR_COUNT } from '../constants/avatars';
import type { User, PublicUser } from '../types';

const updateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatar_id: z.number().int().min(1).max(AVATAR_COUNT).optional(),
  daily_step_goal: z.number().int().min(1000).max(100000).optional(),
});

export async function getMe(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<User>(
    `SELECT id, username, email, avatar_id, daily_step_goal, created_at, updated_at FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(rows[0]);
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.username !== undefined) {
    updates.push(`username = $${idx++}`);
    values.push(parsed.data.username);
  }
  if (parsed.data.avatar_id !== undefined) {
    updates.push(`avatar_id = $${idx++}`);
    values.push(parsed.data.avatar_id);
  }
  if (parsed.data.daily_step_goal !== undefined) {
    updates.push(`daily_step_goal = $${idx++}`);
    values.push(parsed.data.daily_step_goal);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.userId);

  try {
    const { rows } = await pool.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_id, daily_step_goal, created_at, updated_at`,
      values
    );
    res.json(rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.status(400).json({ error: 'Query must be at least 2 characters' });
    return;
  }

  const { rows } = await pool.query<PublicUser>(
    `SELECT id, username, avatar_id FROM users
     WHERE username ILIKE $1 AND id != $2 AND is_guest = FALSE
     ORDER BY username ASC
     LIMIT 20`,
    [`${q}%`, req.userId]
  );
  res.json(rows);
}

const passwordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(6),
});

export async function changePassword(req: Request, res: Response): Promise<void> {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { current_password, new_password } = parsed.data;

  const { rows } = await pool.query<Pick<User, 'password_hash'>>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(new_password, 12);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, req.userId]
  );

  res.json({ message: 'Password updated successfully' });
}

const deleteAccountSchema = z.object({
  password: z.string().min(1).optional(),
});

export async function deleteMe(req: Request, res: Response): Promise<void> {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { rows } = await pool.query<Pick<User, 'password_hash' | 'is_guest'>>(
    `SELECT password_hash, is_guest FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Guest accounts have no user-known password — anyone holding the
  // session token may delete them outright. Real accounts must confirm.
  if (!rows[0].is_guest) {
    if (!parsed.data.password) {
      res.status(400).json({ error: 'Password confirmation required' });
      return;
    }
    const valid = await bcrypt.compare(parsed.data.password, rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Password is incorrect' });
      return;
    }
  }

  // ON DELETE CASCADE on every users(id) foreign key removes the user's
  // friendships, steps, challenges, achievements, tokens, etc.
  await pool.query(`DELETE FROM users WHERE id = $1`, [req.userId]);
  res.status(204).send();
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<PublicUser>(
    `SELECT id, username, avatar_id FROM users WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(rows[0]);
}

export interface NotificationPreferences {
  challenge_invite: boolean;
  friend_request: boolean;
  challenge_started: boolean;
  daily_reminder: boolean;
}

const prefsSchema = z.object({
  challenge_invite: z.boolean().optional(),
  friend_request: z.boolean().optional(),
  challenge_started: z.boolean().optional(),
  daily_reminder: z.boolean().optional(),
});

export async function getNotificationPreferences(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<{ notification_preferences: NotificationPreferences }>(
    `SELECT notification_preferences FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(rows[0].notification_preferences);
}

export async function updateNotificationPreferences(req: Request, res: Response): Promise<void> {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { rows } = await pool.query<{ notification_preferences: NotificationPreferences }>(
    `UPDATE users
     SET notification_preferences = notification_preferences || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING notification_preferences`,
    [JSON.stringify(parsed.data), req.userId]
  );
  res.json(rows[0].notification_preferences);
}
