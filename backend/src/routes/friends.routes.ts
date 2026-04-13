import { Router } from 'express';
import * as friendsCtrl from '../controllers/friends.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', friendsCtrl.getFriends);
router.get('/requests', friendsCtrl.getPendingRequests);
router.get('/sent', friendsCtrl.getSentRequests);
router.post('/request', friendsCtrl.sendFriendRequest);
router.put('/request/:id/accept', friendsCtrl.acceptRequest);
router.put('/request/:id/decline', friendsCtrl.declineRequest);
router.delete('/:id', friendsCtrl.removeFriend);

export default router;
