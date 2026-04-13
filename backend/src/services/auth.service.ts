import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/database';
import { signAccessToken, signRefreshToken } from '../config/jwt';
import type { User, PublicUser } from '../types';

const SALT_ROUNDS = 12;

function toPublicUser(user: User): PublicUser {
  return { id: user.id, username: user.username, avatar_url: user.avatar_url, is_guest: user.is_guest };
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await pool.query<User>(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [username, email.toLowerCase(), hash]
  );
  const user = rows[0];

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await storeRefreshToken(user.id);

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
  const { rows } = await pool.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await storeRefreshToken(user.id);

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function refreshAccessToken(
  token: string
): Promise<{ accessToken: string }> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { rows } = await pool.query(
    `SELECT rt.user_id, u.email
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) throw new Error('INVALID_REFRESH_TOKEN');

  const { user_id, email } = rows[0];
  const accessToken = signAccessToken({ userId: user_id, email });
  return { accessToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function createGuestUser(): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
  const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 chars
  const username = `misafir_${randomSuffix}`;
  const fakeEmail = `guest_${crypto.randomUUID()}@guest.local`;
  const fakeHash = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 4); // fast, not used for login

  const { rows } = await pool.query<User>(
    `INSERT INTO users (username, email, password_hash, is_guest)
     VALUES ($1, $2, $3, TRUE)
     RETURNING *`,
    [username, fakeEmail, fakeHash]
  );
  const user = rows[0];

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await storeRefreshToken(user.id);

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function claimGuestAccount(
  userId: string,
  username: string,
  email: string,
  password: string
): Promise<PublicUser> {
  // Uniqueness checks
  const { rows: existing } = await pool.query(
    `SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3`,
    [username, email.toLowerCase(), userId]
  );
  if (existing.length > 0) throw new Error('USERNAME_OR_EMAIL_TAKEN');

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query<User>(
    `UPDATE users
     SET username = $1, email = $2, password_hash = $3, is_guest = FALSE, updated_at = NOW()
     WHERE id = $4 AND is_guest = TRUE
     RETURNING *`,
    [username, email.toLowerCase(), hash, userId]
  );
  if (rows.length === 0) throw new Error('NOT_GUEST_OR_NOT_FOUND');

  return toPublicUser(rows[0]);
}

async function storeRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return token;
}
