import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { isMqttConnected } from '../mqtt/subscriber';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const mqttStatus: 'ok' | 'error' = isMqttConnected() ? 'ok' : 'error';
  const isHealthy = dbStatus === 'ok' && mqttStatus === 'ok';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: dbStatus,
      mqtt: mqttStatus,
    },
  });
});

export default router;

