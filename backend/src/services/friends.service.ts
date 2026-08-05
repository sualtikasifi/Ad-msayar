import { pool } from '../config/database';
import type { Friendship, PublicUser } from '../types';

export async function getFriends(userId: string): Promise<(PublicUser & { today_steps: number })[]> {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    `SELECT
       u.id, u.username, u.avatar_id,
       COALESCE(ds.step_count, 0) AS today_steps
     FROM friendships f
     JOIN users u ON (
       CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END = u.id
     )
     LEFT JOIN daily_steps ds ON ds.user_id = u.id AND ds.step_date = $2
     WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       AND f.status = 'accepted'
     ORDER BY u.username ASC`,
    [userId, today]
  );
  return rows;
}

export async function getPendingRequests(userId: string): Promise<(Friendship & { from_user: PublicUser })[]> {
  const { rows } = await pool.query(
    `SELECT f.*, json_build_object('id', u.id, 'username', u.username, 'avatar_id', u.avatar_id) AS from_user
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getSentRequests(userId: string): Promise<(Friendship & { to_user: PublicUser })[]> {
  const { rows } = await pool.query(
    `SELECT f.*, json_build_object('id', u.id, 'username', u.username, 'avatar_id', u.avatar_id) AS to_user
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
  if (requesterId === addresseeId) throw new Error('SELF_FRIEND');

  const { rows } = await pool.query<Friendship>(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING *`,
    [requesterId, addresseeId]
  );
  return rows[0];
}

export async function acceptRequest(friendshipId: string, userId: string): Promise<Friendship> {
  const { rows } = await pool.query<Friendship>(
    `UPDATE friendships
     SET status = 'accepted', updated_at = NOW()
     WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
     RETURNING *`,
    [friendshipId, userId]
  );
  if (rows.length === 0) throw new Error('NOT_FOUND');
  return rows[0];
}

export async function declineRequest(friendshipId: string, userId: string): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM friendships
     WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
    [friendshipId, userId]
  );
  if (rowCount === 0) throw new Error('NOT_FOUND');
}

export async function removeFriend(friendshipId: string, userId: string): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM friendships
     WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2) AND status = 'accepted'`,
    [friendshipId, userId]
  );
  if (rowCount === 0) throw new Error('NOT_FOUND');
}
