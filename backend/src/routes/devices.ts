import { Router, Request, Response, NextFunction } from 'express';
import { getDeviceStatus, listDevices } from '../services/deviceService';

const router = Router();

// GET /status (e.g. /api/v1/device/status or /api/devices/status)
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.query['deviceId'] as string | undefined;
    const status = await getDeviceStatus(deviceId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// GET /list (e.g. /api/v1/device/list or /api/devices/list)
router.get('/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await listDevices();
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

// GET / (e.g. /api/devices or /api/v1/devices)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await listDevices();
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

// GET /:deviceId
router.get('/:deviceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getDeviceStatus(req.params.deviceId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

export default router;

