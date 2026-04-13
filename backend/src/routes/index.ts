import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import stepsRoutes from './steps.routes';
import friendsRoutes from './friends.routes';
import challengesRoutes from './challenges.routes';
import leaderboardRoutes from './leaderboard.routes';
import achievementsRoutes from './achievements.routes';
import pushRoutes from './push.routes';
import statsRoutes from './stats.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/steps', stepsRoutes);
router.use('/friends', friendsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/achievements', achievementsRoutes);
router.use('/push', pushRoutes);
router.use('/stats', statsRoutes);

export default router;
