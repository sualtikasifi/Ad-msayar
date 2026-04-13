import { Request, Response } from 'express';
import { z } from 'zod';
import * as challengeService from '../services/challenge.service';
import * as pushService from '../services/push.service';
import { getSocketServer } from '../socket';
import { pool } from '../config/database';

const createSchema = z.object({
  type: z.enum(['1v1', 'group']),
  title: z.string().max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  participant_ids: z.array(z.string().uuid()).min(1).max(3),
});

export async function createChallenge(req: Request, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { type, title, start_date, end_date, participant_ids } = parsed.data;

  if (new Date(end_date) < new Date(start_date)) {
    res.status(400).json({ error: 'end_date must be >= start_date' });
    return;
  }

  if (type === '1v1' && participant_ids.length !== 1) {
    res.status(400).json({ error: '1v1 challenge requires exactly 1 opponent' });
    return;
  }

  try {
    const challenge = await challengeService.createChallenge(
      req.userId!,
      type,
      title ?? null,
      start_date,
      end_date,
      participant_ids
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
