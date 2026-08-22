import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dti_pulse',
    poolMin: Number(process.env.DB_POOL_MIN) || 2,
    poolMax: Number(process.env.DB_POOL_MAX) || 10,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'noreply@digitaltoinfinity.com',
  },

  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  employeeIdPrefix: process.env.EMPLOYEE_ID_PREFIX || 'DTI',

  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  },

  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

// ── Production safety guard ──
// Refuse to boot in production with placeholder/insecure secrets. A default JWT
// secret is public knowledge (it lives in the repo), so anyone could forge an
// admin token. Failing fast is far safer than serving a forgeable API.
if (config.isProduction) {
  const problems: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret') {
    problems.push('JWT_SECRET is missing or still the default placeholder.');
  } else if (process.env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters.');
  }

  if (!process.env.DB_NAME) problems.push('DB_NAME is not set.');
  if (!process.env.DB_USER) problems.push('DB_USER is not set.');
  if (!process.env.DB_PASSWORD) problems.push('DB_PASSWORD is not set.');
  if (!process.env.CLIENT_URL) {
    problems.push('CLIENT_URL is not set (CORS would fall back to localhost).');
  }

  if (problems.length > 0) {
    console.error('\n  Refusing to start in production. Fix these environment variables:\n');
    for (const p of problems) console.error(`    - ${p}`);
    console.error('\n  See DEPLOYMENT.md for the required .env contents.\n');
    process.exit(1);
  }
}
