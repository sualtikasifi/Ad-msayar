import { Router } from 'express';
import * as leaderboardCtrl from '../controllers/leaderboard.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/friends/daily', leaderboardCtrl.getDailyLeaderboard);
router.get('/friends/weekly', leaderboardCtrl.getWeeklyLeaderboard);
router.get('/challenge/:id', leaderboardCtrl.getChallengeLeaderboard);

export default router;
