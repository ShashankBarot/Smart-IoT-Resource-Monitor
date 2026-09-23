import { Router, Request, Response, NextFunction } from 'express';
import {
  getWaterReadings,
  getLatestWaterReading,
  getWaterDailyAnalytics,
  getWaterHourlyAnalytics,
} from '../services/waterService';

const router = Router();

// GET /readings (e.g. /api/v1/water/readings)
router.get('/readings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;
    const deviceId = req.query['deviceId'] as string | undefined;

    const readings = await getWaterReadings(limit, offset, deviceId);
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

// GET /history (alias)
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;
    const deviceId = req.query['deviceId'] as string | undefined;

    const readings = await getWaterReadings(limit, offset, deviceId);
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

// GET /latest
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.query['deviceId'] as string | undefined;
    const reading = await getLatestWaterReading(deviceId);
    res.json(reading);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/daily
router.get('/analytics/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.query['deviceId'] as string | undefined;
    const analytics = await getWaterDailyAnalytics(deviceId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/hourly
router.get('/analytics/hourly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.query['deviceId'] as string | undefined;
    const analytics = await getWaterHourlyAnalytics(deviceId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// GET / (default to readings list)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const readings = await getWaterReadings();
    res.json(readings);
  } catch (err) {
    next(err);
  }
});

export default router;

