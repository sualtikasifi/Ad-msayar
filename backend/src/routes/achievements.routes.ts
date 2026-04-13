import { Router } from 'express';
import * as achievementsCtrl from '../controllers/achievements.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/',          achievementsCtrl.getAllAchievements);
router.get('/me',        achievementsCtrl.getMyAchievements);
router.get('/user/:id',  achievementsCtrl.getUserAchievements);

export default router;
