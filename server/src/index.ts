import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';

// Route imports
import authRoutes from './modules/auth/routes.js';
import attendanceRoutes from './modules/attendance/routes.js';
import leaveRoutes from './modules/leave/routes.js';
import employeeRoutes from './modules/employees/routes.js';
import shiftRoutes from './modules/shifts/routes.js';
import locationRoutes from './modules/locations/routes.js';
import reportRoutes from './modules/reports/routes.js';
import auditRoutes from './modules/audit/routes.js';
import settingsRoutes from './modules/settings/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Security ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.isProduction ? config.clientUrl : [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// ── Rate Limiting ──
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } },
});

app.use(generalLimiter);

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ── Trust proxy (for rate limiting behind reverse proxy) ──
app.set('trust proxy', 1);

// ── API Routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/admin/employees', employeeRoutes);
app.use('/api/admin/shifts', shiftRoutes);
app.use('/api/admin/locations', locationRoutes);
app.use('/api/admin/attendance', reportRoutes);
app.use('/api/admin/audit-logs', auditRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/settings', settingsRoutes);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Unknown API routes return JSON, never the SPA shell ──
app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'API endpoint not found.' },
  });
});

// ── Serve Static Frontend in Production ──
// Path is relative to the compiled entry (server/dist/index.js), so it resolves
// to <repo>/client/dist. This requires the full monorepo on the server, not just server/.
if (config.isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
app.listen(config.port, () => {
  console.log(`\n  DTI Pulse Server running on port ${config.port}`);
  console.log(`  Environment: ${config.env}`);
  console.log(`  Timezone: ${config.timezone}\n`);
});

export default app;
