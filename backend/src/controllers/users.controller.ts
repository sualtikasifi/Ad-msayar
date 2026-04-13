import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import type { User, PublicUser } from '../types';

const updateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export async function getMe(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<User>(
    `SELECT id, username, email, avatar_url, created_at, updated_at FROM users WHERE id = $1`,
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

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.userId);

  try {
    const { rows } = await pool.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_url, created_at, updated_at`,
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
     WHERE username ILIKE $1 AND id != $2
     ORDER BY username ASC
     LIMIT 20`,
    [`${q}%`, req.userId]
  );
  res.json(rows);
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
