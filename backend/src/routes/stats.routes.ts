import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as statsService from '../services/stats.service';

const router = Router();
router.use(requireAuth);

router.get('/weekly', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await statsService.getLast7Days(req.userId!);
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/monthly', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await statsService.getLast30Days(req.userId!);
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/12weeks', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await statsService.getLast12Weeks(req.userId!);
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await statsService.getPersonalRecords(req.userId!);
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.get('/heatmap', async (req: Request, res: Response): Promise<void> => {
  const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  try {
    const data = await statsService.getMonthHeatmap(req.userId!, year, month);
    res.json(data);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

export default router;
