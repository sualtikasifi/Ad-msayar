import { Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import type { User, PublicUser } from '../types';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

const updateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatar_url: z.string().url().optional().nullable(),
  daily_step_goal: z.number().int().min(1000).max(100000).optional(),
});

export async function getMe(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<User>(
    `SELECT id, username, email, avatar_url, daily_step_goal, created_at, updated_at FROM users WHERE id = $1`,
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
  if (parsed.data.avatar_url !== undefined) {
    updates.push(`avatar_url = $${idx++}`);
    values.push(parsed.data.avatar_url);
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_url, daily_step_goal, created_at, updated_at`,
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
    `SELECT id, username, avatar_url FROM users
     WHERE username ILIKE $1 AND id != $2 AND is_guest = FALSE
     ORDER BY username ASC
     LIMIT 20`,
    [`${q}%`, req.userId]
  );
  res.json(rows);
}

const avatarSchema = z.object({
  image_data: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/),
});

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const parsed = avatarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid image data. Provide base64-encoded JPEG/PNG.' });
    return;
  }

  const { image_data } = parsed.data;
  const matches = image_data.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!matches) {
    res.status(400).json({ error: 'Invalid image format' });
    return;
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Image too large (max 5MB)' });
    return;
  }

  // Ensure uploads dir exists
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const filename = `${req.userId!}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  // Remove old avatars with different extension
  for (const oldExt of ['jpg', 'png', 'webp']) {
    const old = path.join(UPLOADS_DIR, `${req.userId!}.${oldExt}`);
    if (old !== filepath && fs.existsSync(old)) fs.unlinkSync(old);
  }

  fs.writeFileSync(filepath, buffer);

  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host') || 'localhost:3000';
  const avatar_url = `${proto}://${host}/uploads/avatars/${filename}`;

  await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
    [avatar_url, req.userId]
  );

  res.json({ avatar_url });
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

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<PublicUser>(
    `SELECT id, username, avatar_url FROM users WHERE id = $1`,
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
