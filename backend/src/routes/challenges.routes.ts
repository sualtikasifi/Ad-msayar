import { Router } from 'express';
import * as challengesCtrl from '../controllers/challenges.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', challengesCtrl.createChallenge);
router.get('/', challengesCtrl.getMyChallenges);
router.get('/:id', challengesCtrl.getChallengeDetail);
router.put('/:id/accept', challengesCtrl.acceptChallenge);
router.put('/:id/decline', challengesCtrl.declineChallenge);
router.put('/:id/cancel', challengesCtrl.cancelChallenge);

export default router;
