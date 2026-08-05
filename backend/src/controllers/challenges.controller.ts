import { Request, Response } from 'express';
import { z } from 'zod';
import * as challengeService from '../services/challenge.service';
import * as pushService from '../services/push.service';
import { getSocketServer } from '../socket';
import { pool } from '../config/database';

const createSchema = z.object({
  type: z.enum(['1v1', 'group']),
  mode: z.enum(['standard', 'duel', 'race']).default('standard'),
  title: z.string().max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  step_goal: z.number().int().positive().optional(),
  penalty_text: z.string().max(200).optional(),
  participant_ids: z.array(z.string().uuid()).min(1).max(3),
});

export async function createChallenge(req: Request, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { type, mode, title, start_date, end_date: rawEndDate, step_goal, penalty_text, participant_ids } = parsed.data;

  // Mode-specific validation
  if (mode === 'duel' && type !== '1v1') {
    res.status(400).json({ error: 'Duel mode requires 1v1 type' });
    return;
  }
  if (mode === 'duel' && participant_ids.length !== 1) {
    res.status(400).json({ error: 'Duel requires exactly 1 opponent' });
    return;
  }
  if (mode === 'race' && !step_goal) {
    res.status(400).json({ error: 'Race mode requires step_goal' });
    return;
  }
  if (type === '1v1' && participant_ids.length !== 1) {
    res.status(400).json({ error: '1v1 challenge requires exactly 1 opponent' });
    return;
  }

  // For duel: end_date = start_date (auto 24h via started_at + 24h check in cron)
  const end_date = mode === 'duel' ? start_date : (rawEndDate ?? start_date);

  if (new Date(end_date) < new Date(start_date)) {
    res.status(400).json({ error: 'end_date must be >= start_date' });
    return;
  }

  // Only accepted friends can be invited — otherwise any authenticated user
  // could spam arbitrary user IDs with challenge invites and push notifications.
  const { rows: friendRows } = await pool.query(
    `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships
     WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'`,
    [req.userId]
  );
  const friendIds = new Set(friendRows.map((r) => r.friend_id));
  if (!participant_ids.every((id) => friendIds.has(id))) {
    res.status(403).json({ error: 'You can only invite accepted friends to a challenge' });
    return;
  }

  try {
    const challenge = await challengeService.createChallenge(
      req.userId!,
      type,
      mode,
      title ?? null,
      start_date,
      end_date,
      participant_ids,
      step_goal ?? null,
      penalty_text ?? null
    );

    // Notify invited participants via socket
    const io = getSocketServer();
    for (const pid of participant_ids) {
      io?.to(`user:${pid}`).emit('challenge:invited', { challenge });
    }

    // Push notification to invited users (fire-and-forget)
    const { rows: creatorRows } = await pool.query<{ username: string }>(
      'SELECT username FROM users WHERE id = $1', [req.userId]
    );
    if (creatorRows[0]) {
      pushService.notifyChallengeInvite(
        participant_ids,
        creatorRows[0].username,
        challenge.id,
        title ?? null,
        type
      ).catch(console.error);
    }

    res.status(201).json(challenge);
  } catch {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
}

export async function getMyChallenges(req: Request, res: Response): Promise<void> {
  try {
    const challenges = await challengeService.getMyChallenges(req.userId!);
    res.json(challenges);
  } catch {
    res.status(500).json({ error: 'Failed to get challenges' });
  }
}

export async function getChallengeDetail(req: Request, res: Response): Promise<void> {
  try {
    const challenge = await challengeService.getChallengeDetail(req.params.id, req.userId!);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found or access denied' });
      return;
    }
    res.json(challenge);
  } catch {
    res.status(500).json({ error: 'Failed to get challenge' });
  }
}

export async function acceptChallenge(req: Request, res: Response): Promise<void> {
  try {
    await challengeService.acceptChallenge(req.params.id, req.userId!);

    const io = getSocketServer();
    if (io) {
      io.to(`challenge:${req.params.id}`).emit('challenge:participant_joined', {
        challengeId: req.params.id,
        userId: req.userId,
      });
    }

    res.json({ message: 'Challenge accepted' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Challenge invitation not found' });
    } else {
      res.status(500).json({ error: 'Failed to accept challenge' });
    }
  }
}

export async function declineChallenge(req: Request, res: Response): Promise<void> {
  try {
    await challengeService.declineChallenge(req.params.id, req.userId!);
    res.json({ message: 'Challenge declined' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Challenge invitation not found' });
    } else {
      res.status(500).json({ error: 'Failed to decline challenge' });
    }
  }
}

export async function cancelChallenge(req: Request, res: Response): Promise<void> {
  try {
    await challengeService.cancelChallenge(req.params.id, req.userId!);
    res.json({ message: 'Challenge cancelled' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Challenge not found or not authorized' });
    } else {
      res.status(500).json({ error: 'Failed to cancel challenge' });
    }
  }
}

export async function claimPenalty(req: Request, res: Response): Promise<void> {
  try {
    await challengeService.claimPenalty(req.params.id, req.userId!);
    res.json({ message: 'Penalty claimed' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Challenge not found or penalty not applicable' });
    } else {
      res.status(500).json({ error: 'Failed to claim penalty' });
    }
  }
}

export async function createInviteLink(req: Request, res: Response): Promise<void> {
  try {
    const result = await challengeService.createInviteLink(req.params.id, req.userId!);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'NOT_FOUND') {
      res.status(404).json({ error: 'Challenge not found' });
    } else if (msg === 'NOT_CREATOR') {
      res.status(403).json({ error: 'Only the creator can generate invite links' });
    } else if (msg === 'CHALLENGE_ENDED') {
      res.status(400).json({ error: 'Cannot create invite link for ended challenge' });
    } else {
      res.status(500).json({ error: 'Failed to create invite link' });
    }
  }
}

export async function getInviteInfo(req: Request, res: Response): Promise<void> {
  try {
    const info = await challengeService.getInviteInfo(req.params.token);
    res.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'TOKEN_NOT_FOUND') {
      res.status(404).json({ error: 'Invite link not found' });
    } else if (msg === 'TOKEN_EXPIRED') {
      res.status(410).json({ error: 'Invite link has expired' });
    } else {
      res.status(500).json({ error: 'Failed to get invite info' });
    }
  }
}

export async function joinByToken(req: Request, res: Response): Promise<void> {
  try {
    const result = await challengeService.joinByInviteToken(req.params.token, req.userId!);
    const io = getSocketServer();
    if (io) {
      io.to(`challenge:${result.challengeId}`).emit('challenge:participant_joined', {
        challengeId: result.challengeId,
        userId: req.userId,
      });
    }
    res.json({ challengeId: result.challengeId, alreadyMember: result.alreadyMember });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'TOKEN_INVALID') {
      res.status(404).json({ error: 'Invite link is invalid or expired' });
    } else if (msg === 'CHALLENGE_NOT_JOINABLE') {
      res.status(400).json({ error: 'Challenge has already ended or is cancelled' });
    } else if (msg === 'CHALLENGE_FULL') {
      res.status(409).json({ error: 'Challenge is full' });
    } else {
      res.status(500).json({ error: 'Failed to join challenge' });
    }
  }
}
