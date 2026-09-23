import { Router, Request, Response, NextFunction } from 'express';
import { getAnomalies } from '../services/anomalyService';

const router = Router();

// GET / (e.g. /api/v1/anomalies or /api/anomalies)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;
    const type = req.query['type'] as string | undefined;

    const anomalies = await getAnomalies(limit, offset, type);
    res.json(anomalies);
  } catch (err) {
    next(err);
  }
});

// GET /recent
router.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10;
    const anomalies = await getAnomalies(limit, 0);
    res.json(anomalies);
  } catch (err) {
    next(err);
  }
});

export default router;

