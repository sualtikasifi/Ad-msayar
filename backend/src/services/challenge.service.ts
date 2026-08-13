import crypto from 'crypto';
import { Server } from 'socket.io';
import { pool } from '../config/database';
import type { Challenge, ChallengeParticipant, ParticipantRanking } from '../types';
import * as achievementService from './achievement.service';
import { todayInAppTimezone } from '../utils/date';
import * as pushService from './push.service';

const MAX_PARTICIPANTS: Record<string, number> = { '1v1': 2, group: 4 };

export async function createChallenge(
  creatorId: string,
  type: '1v1' | 'group',
  mode: 'standard' | 'duel' | 'race',
  title: string | null,
  startDate: string,
  endDate: string,
  participantIds: string[],
  stepGoal: number | null,
  penaltyText: string | null
): Promise<Challenge & { participants: ChallengeParticipant[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Challenge>(
      `INSERT INTO challenges (creator_id, type, mode, status, title, start_date, end_date, step_goal, penalty_text)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8)
       RETURNING *`,
      [creatorId, type, mode, title, startDate, endDate, stepGoal, penaltyText]
    );
    const challenge = rows[0];

    // Add creator as accepted participant
    const allParticipants = [creatorId, ...participantIds.filter(id => id !== creatorId)];
    const participantRows: ChallengeParticipant[] = [];

    for (const uid of allParticipants) {
      const status = uid === creatorId ? 'accepted' : 'invited';
      const joinedAt = uid === creatorId ? 'NOW()' : 'NULL';
      const { rows: pRows } = await client.query<ChallengeParticipant>(
        `INSERT INTO challenge_participants (challenge_id, user_id, status, joined_at)
         VALUES ($1, $2, $3, ${joinedAt})
         RETURNING *`,
        [challenge.id, uid, status]
      );
      participantRows.push(pRows[0]);
    }

    await client.query('COMMIT');
    return { ...challenge, participants: participantRows };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMyChallenges(userId: string): Promise<(Challenge & { my_status: string; my_steps: number; my_rank: number | null })[]> {
  const { rows } = await pool.query(
    `SELECT c.*, cp.status AS my_status, cp.total_steps AS my_steps, cp.rank AS my_rank
     FROM challenges c
     JOIN challenge_participants cp ON cp.challenge_id = c.id
     WHERE cp.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getChallengeDetail(
  challengeId: string,
  userId: string
): Promise<(Challenge & { rankings: ParticipantRanking[] }) | null> {
  // Verify participation
  const { rows: partRows } = await pool.query(
    `SELECT id FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
    [challengeId, userId]
  );
  if (partRows.length === 0) return null;

  const { rows: challengeRows } = await pool.query<Challenge>(
    `SELECT * FROM challenges WHERE id = $1`,
    [challengeId]
  );
  if (challengeRows.length === 0) return null;

  const rankings = await getChallengeRankings(challengeId);
  return { ...challengeRows[0], rankings };
}

export async function acceptChallenge(challengeId: string, userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE challenge_participants
       SET status = 'accepted', joined_at = NOW()
       WHERE challenge_id = $1 AND user_id = $2 AND status = 'invited'`,
      [challengeId, userId]
    );
    if (rowCount === 0) throw new Error('NOT_FOUND');

    // Check if all participants accepted → set active
    const { rows } = await client.query(
      `SELECT COUNT(*) FILTER (WHERE status != 'accepted') AS pending_count
       FROM challenge_participants
       WHERE challenge_id = $1 AND status != 'declined'`,
      [challengeId]
    );
    if (parseInt(rows[0].pending_count) === 0) {
      await client.query(
        `UPDATE challenges SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [challengeId]
      );
      // Notify all accepted participants that challenge has started
      const { rows: challRows } = await client.query<Challenge>(
        'SELECT * FROM challenges WHERE id = $1', [challengeId]
      );
      const { rows: partRows2 } = await client.query<{ user_id: string }>(
        `SELECT user_id FROM challenge_participants WHERE challenge_id = $1 AND status = 'accepted'`,
        [challengeId]
      );
      const participantIds = partRows2.map((r) => r.user_id);
      if (challRows[0]) {
        pushService.notifyChallengeStarted(participantIds, challengeId, challRows[0].title).catch(console.error);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function declineChallenge(challengeId: string, userId: string): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE challenge_participants
     SET status = 'declined'
     WHERE challenge_id = $1 AND user_id = $2 AND status = 'invited'`,
    [challengeId, userId]
  );
  if (rowCount === 0) throw new Error('NOT_FOUND');
}

export async function cancelChallenge(challengeId: string, userId: string): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE challenges SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND creator_id = $2 AND status = 'pending'`,
    [challengeId, userId]
  );
  if (rowCount === 0) throw new Error('NOT_FOUND');
}

export async function getChallengeRankings(challengeId: string): Promise<ParticipantRanking[]> {
  const today = todayInAppTimezone();
  const { rows } = await pool.query(
    `SELECT
       cp.user_id AS "userId",
       u.username,
       u.avatar_id AS "avatarId",
       u.total_xp AS "totalXp",
       cp.total_steps AS "totalSteps",
       cp.rank,
       cp.penalty_claimed AS "penaltyClaimed",
       COALESCE(ds.step_count, 0) AS "stepsToday"
     FROM challenge_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN daily_steps ds ON ds.user_id = cp.user_id AND ds.step_date = $2
     WHERE cp.challenge_id = $1 AND cp.status = 'accepted'
     ORDER BY cp.total_steps DESC`,
    [challengeId, today]
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1, penaltyClaimed: r.penaltyClaimed ?? false }));
}

export async function recalculateUserChallenges(
  userId: string,
  stepDate: string,
  io: Server
): Promise<void> {
  // Find all active challenges for this user covering the step date
  const { rows: activeChallenges } = await pool.query(
    `SELECT c.id FROM challenges c
     JOIN challenge_participants cp ON cp.challenge_id = c.id
     WHERE cp.user_id = $1
       AND cp.status = 'accepted'
       AND c.status = 'active'
       AND c.start_date <= $2
       AND c.end_date >= $2`,
    [userId, stepDate]
  );

  for (const challenge of activeChallenges) {
    await recalculateStandings(challenge.id, io);
  }
}

export async function recalculateStandings(challengeId: string, io: Server): Promise<void> {
  const { rows: challenge } = await pool.query<Challenge>(
    `SELECT * FROM challenges WHERE id = $1`,
    [challengeId]
  );
  if (!challenge[0] || challenge[0].status !== 'active') return;

  const { startDate, endDate } = {
    startDate: challenge[0].start_date,
    endDate: challenge[0].end_date,
  };

  // Aggregate steps over the challenge date range, rank, and persist — all in a
  // single statement (previously this was one UPDATE per participant).
  const { rows: standings } = await pool.query<{ user_id: string; total_steps: number }>(
    `WITH standings AS (
       SELECT cp.user_id,
              COALESCE(SUM(ds.step_count), 0)::int AS total_steps,
              ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ds.step_count), 0) DESC)::int AS rnk
       FROM challenge_participants cp
       LEFT JOIN daily_steps ds ON ds.user_id = cp.user_id
         AND ds.step_date BETWEEN $2 AND $3
       WHERE cp.challenge_id = $1 AND cp.status = 'accepted'
       GROUP BY cp.user_id
     )
     UPDATE challenge_participants cp
     SET total_steps = s.total_steps, rank = s.rnk
     FROM standings s
     WHERE cp.challenge_id = $1 AND cp.user_id = s.user_id
     RETURNING cp.user_id, cp.total_steps`,
    [challengeId, startDate, endDate]
  );

  // Race mode: check if any participant reached the goal
  if (challenge[0].mode === 'race' && challenge[0].step_goal) {
    const winner = standings.find(s => Number(s.total_steps) >= challenge[0].step_goal!);
    if (winner) {
      await pool.query(
        `UPDATE challenges SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [challengeId]
      );
      const finalRankings = await getChallengeRankings(challengeId);
      io.to(`challenge:${challengeId}`).emit('challenge:completed', {
        challengeId,
        winner: { userId: finalRankings[0]?.userId, username: finalRankings[0]?.username, avatarId: finalRankings[0]?.avatarId },
        final_rankings: finalRankings,
      });
      // Push notification
      const participantIds = finalRankings.map(r => r.userId);
      pushService.notifyChallengeCompleted(
        participantIds, challengeId, finalRankings[0]?.username ?? '', challenge[0].title
      ).catch(console.error);
      return;
    }
  }

  // Broadcast updated rankings to the challenge room
  const rankings = await getChallengeRankings(challengeId);
  io.to(`challenge:${challengeId}`).emit('challenge:leaderboard_update', {
    challengeId,
    rankings,
  });
}

// ─── Invite Links ─────────────────────────────────────────────────────────

export interface InviteInfo {
  challengeId: string;
  title: string | null;
  type: '1v1' | 'group';
  status: string;
  start_date: string;
  end_date: string;
  creatorUsername: string;
  participantCount: number;
  maxParticipants: number;
  token: string;
  expiresAt: string;
}

function generateToken(): string {
  // 8-char uppercase alphanumeric (no ambiguous chars like 0/O, 1/I/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let token = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

export async function createInviteLink(challengeId: string, userId: string): Promise<{ token: string; expiresAt: string }> {
  // Verify user is creator
  const { rows: challRows } = await pool.query<Challenge>(
    `SELECT * FROM challenges WHERE id = $1`, [challengeId]
  );
  if (challRows.length === 0) throw new Error('NOT_FOUND');
  if (challRows[0].creator_id !== userId) throw new Error('NOT_CREATOR');
  if (['completed', 'cancelled'].includes(challRows[0].status)) throw new Error('CHALLENGE_ENDED');

  // Return existing non-expired link if available
  const { rows: existing } = await pool.query(
    `SELECT token, expires_at FROM challenge_invite_links
     WHERE challenge_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [challengeId]
  );
  if (existing.length > 0) {
    return { token: existing[0].token, expiresAt: existing[0].expires_at };
  }

  // Generate unique token
  let token: string;
  let attempts = 0;
  do {
    token = generateToken();
    const { rows } = await pool.query(
      `SELECT id FROM challenge_invite_links WHERE token = $1`, [token]
    );
    if (rows.length === 0) break;
    attempts++;
  } while (attempts < 5);

  const { rows } = await pool.query(
    `INSERT INTO challenge_invite_links (challenge_id, created_by, token)
     VALUES ($1, $2, $3)
     RETURNING token, expires_at`,
    [challengeId, userId, token!]
  );
  return { token: rows[0].token, expiresAt: rows[0].expires_at };
}

export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const { rows } = await pool.query(
    `SELECT
       il.token, il.expires_at AS "expiresAt",
       c.id AS "challengeId", c.title, c.type, c.status,
       c.start_date, c.end_date,
       u.username AS "creatorUsername",
       (SELECT COUNT(*) FROM challenge_participants cp
        WHERE cp.challenge_id = c.id AND cp.status != 'declined')::int AS "participantCount"
     FROM challenge_invite_links il
     JOIN challenges c ON c.id = il.challenge_id
     JOIN users u ON u.id = il.created_by
     WHERE il.token = $1`,
    [token]
  );
  if (rows.length === 0) throw new Error('TOKEN_NOT_FOUND');
  if (new Date(rows[0].expiresAt) < new Date()) throw new Error('TOKEN_EXPIRED');

  const row = rows[0];
  return {
    ...row,
    maxParticipants: MAX_PARTICIPANTS[row.type] ?? 4,
  };
}

export async function joinByInviteToken(
  token: string,
  userId: string
): Promise<{ challengeId: string; alreadyMember: boolean }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate token. Locks the challenge row so concurrent joins on the
    // same invite link serialize instead of both passing the capacity
    // check below before either has inserted their participant row.
    const { rows: linkRows } = await client.query(
      `SELECT il.challenge_id, c.type, c.status, c.title
       FROM challenge_invite_links il
       JOIN challenges c ON c.id = il.challenge_id
       WHERE il.token = $1 AND il.expires_at > NOW()
       FOR UPDATE OF c`,
      [token]
    );
    if (linkRows.length === 0) throw new Error('TOKEN_INVALID');

    const { challenge_id, type, status, title } = linkRows[0];

    if (!['pending', 'active'].includes(status)) throw new Error('CHALLENGE_NOT_JOINABLE');

    // Check if already a participant
    const { rows: existing } = await client.query(
      `SELECT status FROM challenge_participants
       WHERE challenge_id = $1 AND user_id = $2`,
      [challenge_id, userId]
    );
    if (existing.length > 0) {
      await client.query('COMMIT');
      return { challengeId: challenge_id, alreadyMember: true };
    }

    // Check capacity
    const maxP = MAX_PARTICIPANTS[type] ?? 4;
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*) AS cnt FROM challenge_participants
       WHERE challenge_id = $1 AND status != 'declined'`,
      [challenge_id]
    );
    if (parseInt(countRows[0].cnt) >= maxP) throw new Error('CHALLENGE_FULL');

    // Add user as accepted participant
    await client.query(
      `INSERT INTO challenge_participants (challenge_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())`,
      [challenge_id, userId]
    );

    // Auto-activate if all non-declined are now accepted
    const { rows: pendingRows } = await client.query(
      `SELECT COUNT(*) AS pending FROM challenge_participants
       WHERE challenge_id = $1 AND status = 'invited'`,
      [challenge_id]
    );
    if (parseInt(pendingRows[0].pending) === 0 && status === 'pending') {
      await client.query(
        `UPDATE challenges SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [challenge_id]
      );
      // Push: challenge started
      const { rows: partRows } = await client.query<{ user_id: string }>(
        `SELECT user_id FROM challenge_participants WHERE challenge_id = $1 AND status = 'accepted'`,
        [challenge_id]
      );
      pushService.notifyChallengeStarted(
        partRows.map((r) => r.user_id),
        challenge_id,
        title
      ).catch(console.error);
    }

    await client.query('COMMIT');
    return { challengeId: challenge_id, alreadyMember: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function claimPenalty(challengeId: string, userId: string): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE challenge_participants
     SET penalty_claimed = TRUE
     WHERE challenge_id = $1 AND user_id = $2
       AND status = 'accepted'
       AND EXISTS (
         SELECT 1 FROM challenges
         WHERE id = $1 AND status = 'completed' AND penalty_text IS NOT NULL
       )`,
    [challengeId, userId]
  );
  if (rowCount === 0) throw new Error('NOT_FOUND');
}

export async function completeExpiredChallenges(io: Server): Promise<void> {
  // `CURRENT_DATE` resolves in the DB server's configured timezone (typically
  // UTC on managed Postgres), while every other "today" comparison in this
  // app (getChallengeRankings, recalculateUserChallenges, etc.) uses the
  // fixed UTC+3 app timezone. Comparing against a mismatched "today" could
  // complete challenges up to a few hours early/late relative to the rest of
  // the app's date bucketing — pass the app-timezone date explicitly instead.
  const today = todayInAppTimezone();
  const { rows } = await pool.query<Challenge>(
    `UPDATE challenges
     SET status = 'completed', updated_at = NOW()
     WHERE status = 'active' AND (
       (mode != 'duel' AND end_date < $1) OR
       (mode = 'duel' AND started_at IS NOT NULL AND started_at + INTERVAL '24 hours' < NOW())
     )
     RETURNING *`,
    [today]
  );

  for (const challenge of rows) {
    const rankings = await getChallengeRankings(challenge.id);
    const winner = rankings[0] ?? null;

    io.to(`challenge:${challenge.id}`).emit('challenge:completed', {
      challengeId: challenge.id,
      winner: winner ? { userId: winner.userId, username: winner.username, avatarId: winner.avatarId } : null,
      final_rankings: rankings,
    });

    // Push notification to all participants
    if (winner) {
      const participantIds = rankings.map((r) => r.userId);
      pushService.notifyChallengeCompleted(
        participantIds,
        challenge.id,
        winner.username,
        challenge.title
      ).catch(console.error);

      // Penalty reminder push to losers
      if (challenge.penalty_text) {
        const loserIds = rankings.filter(r => r.rank !== 1).map(r => r.userId);
        if (loserIds.length > 0) {
          pushService.sendPenaltyReminder(loserIds, challenge.id, challenge.penalty_text).catch(console.error);
        }
      }
    }

    // Award challenge achievements to all participants
    for (const participant of rankings) {
      const isWinner = participant.rank === 1;
      achievementService
        .checkChallengeAchievements(participant.userId, challenge.id, isWinner, challenge.type, io)
        .catch(console.error);
    }
  }
}
