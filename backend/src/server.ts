/**
 * server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP + WebSocket entry-point for the Smart IoT Monitoring backend.
 *
 * Responsibilities:
 *   • Creates the Node.js HTTP server wrapping the Express app
 *   • Attaches the Socket.IO server so it shares the same port
 *   • Connects to the MQTT broker via the subscriber module
 *   • Binds to PORT and begins accepting connections
 *   • Performs a graceful shutdown on SIGINT / SIGTERM
 * ─────────────────────────────────────────────────────────────────────────────
 */
// Reload triggered to connect to Docker Mosquitto at 10.241.153.251:1883

import 'dotenv/config';
import http from 'http';
import { app, attachSocketIO } from './app';
import { Server as SocketIOServer } from 'socket.io';
import { connectMqttSubscriber, disconnectMqttSubscriber } from './mqtt/subscriber';
import { startDeviceWatchdog, stopDeviceWatchdog } from './services/deviceService';
import logger from './utils/logger';

// ── Configuration ─────────────────────────────────────────────────────────────

const PORT    = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST    = process.env['HOST'] ?? '0.0.0.0';
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// ── 1. Create HTTP server wrapping the Express app ────────────────────────────

const httpServer = http.createServer(app);

// ── 2. Attach Socket.IO to the HTTP server ────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  /**
   * CORS: In development, allow any origin.
   * In production, lock this down to your frontend domain.
   */
  cors: {
    origin: process.env['CORS_ORIGIN'] ?? '*',
    methods: ['GET', 'POST'],
  },
  /**
   * Transport order: WebSockets first for lowest latency;
   * fall back to long-polling if WS is unavailable (e.g., certain proxies).
   */
  transports: ['websocket', 'polling'],
});

// Hand the io instance back to app.ts so controllers / subscriber can emit
attachSocketIO(io);

// ── 3. Socket.IO connection lifecycle logging ─────────────────────────────────

io.on('connection', (socket) => {
  const clientIp = socket.handshake.address;
  logger.info(`[Socket.IO] Client connected    id=${socket.id}  ip=${clientIp}`);

  socket.on('disconnect', (reason) => {
    logger.info(`[Socket.IO] Client disconnected id=${socket.id}  reason=${reason}`);
  });

  socket.on('error', (err: Error) => {
    logger.error(`[Socket.IO] Socket error id=${socket.id}  error=${err.message}`);
  });
});

// ── 4. Connect to MQTT broker ─────────────────────────────────────────────────

/**
 * The subscriber module connects to Mosquitto and begins consuming messages
 * from 'resource/readings' and 'resource/status'.  We pass `io` so that
 * incoming MQTT messages can be forwarded to all connected WebSocket clients.
 */
connectMqttSubscriber(io);

// Start the periodic watchdog timer for detecting offline devices
startDeviceWatchdog(io);

// ── 5. Start listening ────────────────────────────────────────────────────────

httpServer.listen(PORT, HOST, () => {
  const divider = '═'.repeat(55);

  logger.info(divider);
  logger.info('  Smart IoT Water & Electricity Monitoring – Backend');
  logger.info(divider);
  logger.info(`  Environment : ${NODE_ENV}`);
  logger.info(`  HTTP server : http://${HOST}:${PORT}`);
  logger.info(`  WebSockets  : ws://${HOST}:${PORT}`);
  logger.info(`  Health check: http://localhost:${PORT}/api/health`);
  logger.info(divider);
});

// ── 6. Graceful shutdown ──────────────────────────────────────────────────────

/**
 * On SIGINT (Ctrl+C) or SIGTERM (process manager / Docker):
 *  a) Stop accepting new HTTP requests
 *  b) Disconnect all Socket.IO clients
 *  c) Disconnect the MQTT subscriber
 *  d) Exit cleanly
 *
 * We give each step a short timeout to prevent hanging.
 */
async function shutdown(signal: string): Promise<void> {
  logger.warn(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new HTTP connections (existing keep-alives finish)
  httpServer.close((err) => {
    if (err) {
      logger.error('[Server] Error while closing HTTP server:', err);
    } else {
      logger.info('[Server] HTTP server closed.');
    }
  });

  // Close all Socket.IO connections
  await new Promise<void>((resolve) => {
    io.close(() => {
      logger.info('[Server] Socket.IO server closed.');
      resolve();
    });
  });

  // Disconnect from MQTT broker
  await disconnectMqttSubscriber();
  logger.info('[Server] MQTT subscriber disconnected.');

  // Stop device watchdog timer
  stopDeviceWatchdog();

  logger.info('[Server] Shutdown complete. Goodbye! 👋');
  process.exit(0);
}

process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

/** Catch unhandled promise rejections so the process doesn't crash silently */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection:', { reason, promise });
});

/** Catch synchronous uncaught exceptions */
process.on('uncaughtException', (err: Error) => {
  logger.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

export { httpServer, io };
