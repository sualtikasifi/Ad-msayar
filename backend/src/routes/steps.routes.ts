import { Router } from 'express';
import * as stepsCtrl from '../controllers/steps.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/sync', stepsCtrl.syncSteps);
router.get('/me/today', stepsCtrl.getTodaySteps);
router.get('/me', stepsCtrl.getMySteps);
router.get('/user/:id', stepsCtrl.getUserSteps);

export default router;
