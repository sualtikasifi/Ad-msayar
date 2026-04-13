import { Request, Response } from 'express';
import { z } from 'zod';
import * as stepsService from '../services/steps.service';
import * as challengeService from '../services/challenge.service';
import { getSocketServer } from '../socket';

const syncSchema = z.object({
  step_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  step_count: z.number().int().min(0).max(200000),
});

export async function syncSteps(req: Request, res: Response): Promise<void> {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const userId = req.userId!;
    const { step_date, step_count } = parsed.data;
    const record = await stepsService.syncSteps(userId, step_date, step_count);

    // Recalculate any active challenge standings for this user
    const io = getSocketServer();
    if (io) {
      await challengeService.recalculateUserChallenges(userId, step_date, io);
    }

    res.json(record);
  } catch {
    res.status(500).json({ error: 'Failed to sync steps' });
  }
}

export async function getTodaySteps(req: Request, res: Response): Promise<void> {
  try {
    const stepCount = await stepsService.getTodaySteps(req.userId!);
    res.json({ step_count: stepCount, date: new Date().toISOString().split('T')[0] });
  } catch {
    res.status(500).json({ error: 'Failed to get steps' });
  }
}

export async function getMySteps(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required' });
    return;
  }

  try {
    const steps = await stepsService.getStepsRange(req.userId!, from as string, to as string);
    res.json(steps);
  } catch {
    res.status(500).json({ error: 'Failed to get steps' });
  }
}

export async function getUserSteps(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required' });
    return;
  }

  try {
    const steps = await stepsService.getUserStepsRange(
      req.userId!,
      id,
      from as string,
      to as string
    );
    res.json(steps);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FRIENDS') {
      res.status(403).json({ error: 'Not friends with this user' });
    } else {
      res.status(500).json({ error: 'Failed to get steps' });
    }
  }
}
