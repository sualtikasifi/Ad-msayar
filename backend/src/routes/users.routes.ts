import { Router } from 'express';
import * as usersCtrl from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/me', usersCtrl.getMe);
router.put('/me', usersCtrl.updateMe);
router.put('/me/password', usersCtrl.changePassword);
router.delete('/me', usersCtrl.deleteMe);
router.get('/me/notification-preferences', usersCtrl.getNotificationPreferences);
router.put('/me/notification-preferences', usersCtrl.updateNotificationPreferences);
router.get('/search', usersCtrl.searchUsers);
router.get('/:id', usersCtrl.getUserById);

export default router;
