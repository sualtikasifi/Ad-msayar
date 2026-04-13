import { Server } from 'socket.io';
import { pool } from '../config/database';
import type { Challenge, ChallengeParticipant, ParticipantRanking } from '../types';
import * as achievementService from './achievement.service';

export async function createChallenge(
  creatorId: string,
  type: '1v1' | 'group',
  title: string | null,
  startDate: string,
  endDate: string,
  participantIds: string[]
): Promise<Challenge & { participants: ChallengeParticipant[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Challenge>(
      `INSERT INTO challenges (creator_id, type, status, title, start_date, end_date)
       VALUES ($1, $2, 'pending', $3, $4, $5)
       RETURNING *`,
      [creatorId, type, title, startDate, endDate]
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
        `UPDATE challenges SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [challengeId]
      );
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
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    `SELECT
       cp.user_id AS "userId",
       u.username,
       u.avatar_url AS "avatarUrl",
       cp.total_steps AS "totalSteps",
       cp.rank,
       COALESCE(ds.step_count, 0) AS "stepsToday"
     FROM challenge_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN daily_steps ds ON ds.user_id = cp.user_id AND ds.step_date = $2
     WHERE cp.challenge_id = $1 AND cp.status = 'accepted'
     ORDER BY cp.total_steps DESC`,
    [challengeId, today]
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
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

  // Aggregate steps for each accepted participant over challenge date range
  const { rows: standings } = await pool.query(
    `SELECT cp.user_id, COALESCE(SUM(ds.step_count), 0) AS total_steps
     FROM challenge_participants cp
     LEFT JOIN daily_steps ds ON ds.user_id = cp.user_id
       AND ds.step_date BETWEEN $2 AND $3
     WHERE cp.challenge_id = $1 AND cp.status = 'accepted'
     GROUP BY cp.user_id
     ORDER BY total_steps DESC`,
    [challengeId, startDate, endDate]
  );

  // Update each participant's total_steps and rank
  for (let i = 0; i < standings.length; i++) {
    const { user_id, total_steps } = standings[i];
    await pool.query(
      `UPDATE challenge_participants
       SET total_steps = $1, rank = $2
       WHERE challenge_id = $3 AND user_id = $4`,
      [total_steps, i + 1, challengeId, user_id]
    );
  }

  // Broadcast updated rankings to the challenge room
  const rankings = await getChallengeRankings(challengeId);
  io.to(`challenge:${challengeId}`).emit('challenge:leaderboard_update', {
    challengeId,
    rankings,
  });
}

export async function completeExpiredChallenges(io: Server): Promise<void> {
  const { rows } = await pool.query<Challenge>(
    `UPDATE challenges
     SET status = 'completed', updated_at = NOW()
     WHERE status = 'active' AND end_date < CURRENT_DATE
     RETURNING *`
  );

  for (const challenge of rows) {
    const rankings = await getChallengeRankings(challenge.id);
    const winner = rankings[0] ?? null;

    io.to(`challenge:${challenge.id}`).emit('challenge:completed', {
      challengeId: challenge.id,
      winner: winner ? { userId: winner.userId, username: winner.username, avatarUrl: winner.avatarUrl } : null,
      final_rankings: rankings,
    });

    // Award challenge achievements to all participants
    for (const participant of rankings) {
      const isWinner = participant.rank === 1;
      achievementService
        .checkChallengeAchievements(participant.userId, challenge.id, isWinner, challenge.type, io)
        .catch(console.error);
    }
  }
}
