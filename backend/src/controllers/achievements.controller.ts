import { Request, Response } from 'express';
import * as achievementService from '../services/achievement.service';

export async function getAllAchievements(req: Request, res: Response): Promise<void> {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json(achievements);
  } catch {
    res.status(500).json({ error: 'Failed to get achievements' });
  }
}

export async function getMyAchievements(req: Request, res: Response): Promise<void> {
  try {
    const [earned, all, xp] = await Promise.all([
      achievementService.getMyAchievements(req.userId!),
      achievementService.getAllAchievements(),
      achievementService.getUserXp(req.userId!),
    ]);

    const earnedIds = new Set(earned.map((a) => a.id));

    res.json({
      total_xp: xp,
      earned_count: earned.length,
      total_count: all.length,
      recently_earned: earned.slice(0, 5),
      all: all.map((a) => ({
        ...a,
        earned: earnedIds.has(a.id),
        earned_at: earned.find((e) => e.id === a.id)?.earned_at ?? null,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get achievements' });
  }
}

export async function getUserAchievements(req: Request, res: Response): Promise<void> {
  try {
    const [earned, all, xp] = await Promise.all([
      achievementService.getMyAchievements(req.params.id),
      achievementService.getAllAchievements(),
      achievementService.getUserXp(req.params.id),
    ]);

    const earnedIds = new Set(earned.map((a) => a.id));

    res.json({
      total_xp: xp,
      earned_count: earned.length,
      total_count: all.length,
      all: all.map((a) => ({
        ...a,
        earned: earnedIds.has(a.id),
        earned_at: earned.find((e) => e.id === a.id)?.earned_at ?? null,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get achievements' });
  }
}
