import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter, credentialLimiter } from '../middleware/rateLimit';

const router = Router();

// Throttle the whole auth surface, with a stricter limit on credential endpoints.
router.use(authLimiter);

router.post('/register', credentialLimiter, authCtrl.register);
router.post('/login', credentialLimiter, authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', requireAuth, authCtrl.logout);
router.post('/guest', authCtrl.guestLogin);
router.post('/claim', requireAuth, authCtrl.claimAccount);

export default router;
