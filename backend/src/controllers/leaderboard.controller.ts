import { Request, Response } from 'express';
import * as leaderboardService from '../services/leaderboard.service';
import * as challengeService from '../services/challenge.service';

export async function getDailyLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await leaderboardService.getDailyLeaderboard(req.userId!);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
}

export async function getWeeklyLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await leaderboardService.getWeeklyLeaderboard(req.userId!);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
}

export async function getChallengeLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const rankings = await challengeService.getChallengeRankings(req.params.id);
    res.json(rankings);
  } catch {
    res.status(500).json({ error: 'Failed to get challenge leaderboard' });
  }
}
