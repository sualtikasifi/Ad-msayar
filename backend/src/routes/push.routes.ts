import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import * as pushService from '../services/push.service';

const router = Router();
router.use(requireAuth);

const tokenSchema = z.object({ token: z.string().min(10) });

router.post('/token', async (req: Request, res: Response): Promise<void> => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token' });
    return;
  }
  try {
    await pushService.saveToken(req.userId!, parsed.data.token);
    res.json({ message: 'Token saved' });
  } catch {
    res.status(500).json({ error: 'Failed to save token' });
  }
});

router.delete('/token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: 'token required' }); return; }
  await pushService.removeToken(token).catch(() => {});
  res.json({ message: 'Token removed' });
});

export default router;
