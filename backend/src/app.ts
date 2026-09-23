/**
 * app.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Express application factory for the Smart IoT Monitoring backend.
 *
 * Responsibilities:
 *   • Configures Express middleware (JSON body parser, CORS, request logger)
 *   • Mounts all API routers under /api/*
 *   • Exposes the Socket.IO instance via a module-level setter so that
 *     route controllers and the MQTT subscriber can emit real-time events
 *     without circular-dependency issues
 *   • Provides a 404 and a centralised error handler
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';

// ── Router imports ────────────────────────────────────────────────────────────
import healthRouter      from './routes/health';
import devicesRouter     from './routes/devices';
import waterRouter       from './routes/water';
import electricityRouter from './routes/electricity';
import anomaliesRouter   from './routes/anomalies';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Standard API error shape returned by the centralised error handler */
interface ApiError extends Error {
  statusCode?: number;
  details?   : unknown;
}

// ── Module-level Socket.IO instance ──────────────────────────────────────────

/**
 * The io instance is created in server.ts (which controls the HTTP server
 * lifecycle), then injected here via attachSocketIO().  Code that needs to
 * emit events should call getIO() which will throw early if io was never set.
 */
let _io: SocketIOServer | null = null;

/**
 * Called once from server.ts after the Socket.IO server has been created.
 * @param io – the Socket.IO server instance attached to the HTTP server
 */
export function attachSocketIO(io: SocketIOServer): void {
  _io = io;
}

/**
 * Returns the active Socket.IO server instance.
 * @throws Error if attachSocketIO() has not been called yet.
 */
export function getIO(): SocketIOServer {
  if (!_io) {
    throw new Error(
      'Socket.IO has not been initialised yet. ' +
      'Ensure attachSocketIO() is called in server.ts before using getIO().',
    );
  }
  return _io;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app: Application = express();

// ── Middleware stack ──────────────────────────────────────────────────────────

/**
 * CORS – allow configurable origins.
 * In production, replace the wildcard with the deployed frontend URL,
 * e.g.  CORS_ORIGIN=https://your-dashboard.example.com
 */
app.use(
  cors({
    origin     : process.env['CORS_ORIGIN'] ?? '*',
    methods    : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

/** Parse incoming JSON request bodies (limit 1 MB) */
app.use(express.json({ limit: '1mb' }));

/** Parse URL-encoded form bodies (e.g. from Postman form submissions) */
app.use(express.urlencoded({ extended: true }));

/**
 * Minimal request logger – logs method, path, and status code.
 * In production you might replace this with Morgan or a structured logger.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const elapsed = Date.now() - start;
    const level   = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${level}] ${new Date().toISOString()}  ${req.method} ${req.originalUrl}  → ${res.statusCode}  (${elapsed}ms)`,
    );
  });

  next();
});

// ── API routes ────────────────────────────────────────────────────────────────

/**
 * Mount routes for both /api/v1 (frontend default) and /api (legacy/docs).
 * Also support both /device and /devices.
 */
const apiPrefixes = ['/api/v1', '/api'];

for (const prefix of apiPrefixes) {
  app.use(`${prefix}/health`,      healthRouter);
  app.use(`${prefix}/devices`,     devicesRouter);
  app.use(`${prefix}/device`,      devicesRouter);
  app.use(`${prefix}/water`,       waterRouter);
  app.use(`${prefix}/electricity`, electricityRouter);
  app.use(`${prefix}/anomalies`,   anomaliesRouter);
}

// ── 404 handler ───────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success : false,
    message : 'Route not found',
    path    : _req.originalUrl,
  });
});

// ── Centralised error handler ─────────────────────────────────────────────────

/**
 * Express error middleware must have 4 parameters.
 * Any middleware or route that calls next(err) will land here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode ?? 500;
  const isDev      = (process.env['NODE_ENV'] ?? 'development') === 'development';

  console.error(`[Error Handler] ${err.message}`, err.stack);

  res.status(statusCode).json({
    success : false,
    message : err.message ?? 'Internal Server Error',
    // Only expose stack traces and details in development builds
    ...(isDev && { stack: err.stack }),
    ...(err.details !== undefined && { details: err.details }),
  });
});

// ── Exports ───────────────────────────────────────────────────────────────────

export { app };
