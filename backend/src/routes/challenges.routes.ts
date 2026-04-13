import { Router } from 'express';
import * as challengesCtrl from '../controllers/challenges.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', challengesCtrl.createChallenge);
router.get('/', challengesCtrl.getMyChallenges);

// Invite link routes — must be declared BEFORE /:id to avoid param capture
router.get('/invite/:token', challengesCtrl.getInviteInfo);
router.post('/invite/:token/join', challengesCtrl.joinByToken);

router.get('/:id', challengesCtrl.getChallengeDetail);
router.put('/:id/accept', challengesCtrl.acceptChallenge);
router.put('/:id/decline', challengesCtrl.declineChallenge);
router.put('/:id/cancel', challengesCtrl.cancelChallenge);
router.post('/:id/invite-link', challengesCtrl.createInviteLink);

export default router;
