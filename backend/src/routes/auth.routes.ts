import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', requireAuth, authCtrl.logout);
router.post('/guest', authCtrl.guestLogin);
router.post('/claim', requireAuth, authCtrl.claimAccount);

export default router;
