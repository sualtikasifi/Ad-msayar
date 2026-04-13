import { Router } from 'express';
import * as usersCtrl from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/me', usersCtrl.getMe);
router.put('/me', usersCtrl.updateMe);
router.get('/search', usersCtrl.searchUsers);
router.get('/:id', usersCtrl.getUserById);

export default router;
