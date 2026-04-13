import { Request, Response } from 'express';
import { z } from 'zod';
import * as friendsService from '../services/friends.service';
import * as achievementService from '../services/achievement.service';
import * as pushService from '../services/push.service';
import { getSocketServer } from '../socket';
import { pool } from '../config/database';

const requestSchema = z.object({
  addressee_id: z.string().uuid(),
});

export async function getFriends(req: Request, res: Response): Promise<void> {
  try {
    const friends = await friendsService.getFriends(req.userId!);
    res.json(friends);
  } catch {
    res.status(500).json({ error: 'Failed to get friends' });
  }
}

export async function getPendingRequests(req: Request, res: Response): Promise<void> {
  try {
    const requests = await friendsService.getPendingRequests(req.userId!);
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to get requests' });
  }
}

export async function getSentRequests(req: Request, res: Response): Promise<void> {
  try {
    const requests = await friendsService.getSentRequests(req.userId!);
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
}

export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const friendship = await friendsService.sendFriendRequest(req.userId!, parsed.data.addressee_id);

    // Notify target user via socket
    const io = getSocketServer();
    io?.to(`user:${parsed.data.addressee_id}`).emit('friend:request_received', {
      friendship,
      from: { id: req.userId },
    });

    // Push notification (fire-and-forget)
    const { rows } = await pool.query<{ username: string }>(
      'SELECT username FROM users WHERE id = $1', [req.userId]
    );
    if (rows[0]) {
      pushService.notifyFriendRequest(parsed.data.addressee_id, rows[0].username).catch(console.error);
    }

    res.status(201).json(friendship);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SELF_FRIEND') {
      res.status(400).json({ error: 'Cannot friend yourself' });
    } else if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: 'Friend request already exists' });
    } else {
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  }
}

export async function acceptRequest(req: Request, res: Response): Promise<void> {
  try {
    const friendship = await friendsService.acceptRequest(req.params.id, req.userId!);

    const io = getSocketServer();
    io?.to(`user:${friendship.requester_id}`).emit('friend:request_accepted', {
      friendship,
      by: { id: req.userId },
    });

    // Check friend achievements for both users (fire-and-forget)
    achievementService.checkFriendAchievements(req.userId!, io).catch(console.error);
    achievementService.checkFriendAchievements(friendship.requester_id, io).catch(console.error);

    // Push notification to the requester
    const { rows: myRows } = await pool.query<{ username: string }>(
      'SELECT username FROM users WHERE id = $1', [req.userId]
    );
    if (myRows[0]) {
      pushService.notifyFriendAccepted(friendship.requester_id, myRows[0].username).catch(console.error);
    }

    res.json(friendship);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Request not found' });
    } else {
      res.status(500).json({ error: 'Failed to accept request' });
    }
  }
}

export async function declineRequest(req: Request, res: Response): Promise<void> {
  try {
    await friendsService.declineRequest(req.params.id, req.userId!);
    res.json({ message: 'Request declined' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Request not found' });
    } else {
      res.status(500).json({ error: 'Failed to decline request' });
    }
  }
}

export async function removeFriend(req: Request, res: Response): Promise<void> {
  try {
    await friendsService.removeFriend(req.params.id, req.userId!);
    res.json({ message: 'Friend removed' });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Friendship not found' });
    } else {
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  }
}
