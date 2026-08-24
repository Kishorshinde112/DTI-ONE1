import { Router, type Request, type Response } from 'express';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../../db/index.js';
import { users, otpCodes } from '../../db/schema.js';
import { config } from '../../config/index.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, generateToken, type AuthUser } from '../../middleware/auth.js';
import { sendOtpEmail } from '../../services/email.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';
import {
  signupSchema, loginSchema, verifyOtpSchema,
  forgotPasswordSchema, resetPasswordSchema, googleAuthSchema,
} from '../../validators/index.js';

const router = Router();
const googleClient = config.google.clientId ? new OAuth2Client(config.google.clientId) : null;

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ── Signup ──
router.post('/signup', validate(signupSchema), asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, username, email, phone, password } = req.body;

  const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingEmail) return errorResponse(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');

  const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existingUsername) return errorResponse(res, 409, 'USERNAME_EXISTS', 'This username is already taken.');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const [maxIdRow] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(users);
  const nextNum = (maxIdRow?.maxId || 0) + 1;
  const employeeId = `${config.employeeIdPrefix}-${String(nextNum).padStart(4, '0')}`;

  await db.insert(users).values({
    email,
    username,
    passwordHash,
    firstName,
    lastName,
    phone,
    employeeId,
    role: 'staff',
    accountStatus: 'pending_verification',
    emailVerified: false,
  });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
  await db.insert(otpCodes).values({ email, code: otp, purpose: 'registration', expiresAt });

  await sendOtpEmail(email, otp, 'registration');
  if (!config.isProduction) console.log(`[DEV OTP] Registration OTP for ${email}: ${otp}`);

  successResponse(res, { message: 'Account created. Please verify your email with the OTP sent.' }, 201);
}));

// ── Verify OTP ──
router.post('/verify-otp', validate(verifyOtpSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, code, purpose } = req.body;

  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose), eq(otpCodes.used, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otpRecord) return errorResponse(res, 400, 'OTP_NOT_FOUND', 'No valid OTP found. Please request a new one.');

  if (new Date() > otpRecord.expiresAt) return errorResponse(res, 400, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.');

  if (otpRecord.attempts >= config.otp.maxAttempts) return errorResponse(res, 429, 'OTP_MAX_ATTEMPTS', 'Maximum verification attempts exceeded.');

  if (otpRecord.code !== code) {
    await db.update(otpCodes).set({ attempts: otpRecord.attempts + 1 }).where(eq(otpCodes.id, otpRecord.id));
    return errorResponse(res, 400, 'OTP_INVALID', 'Invalid OTP. Please try again.');
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));

  if (purpose === 'registration') {
    await db.update(users)
      .set({ accountStatus: 'active', emailVerified: true })
      .where(eq(users.email, email));

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const authUser: AuthUser = {
        id: user.id, email: user.email, username: user.username,
        role: user.role, employeeId: user.employeeId,
        firstName: user.firstName, lastName: user.lastName,
      };
      const token = generateToken(authUser);
      res.cookie('token', token, {
        httpOnly: true, secure: config.isProduction,
        sameSite: config.isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return successResponse(res, { user: authUser, token });
    }
  }

  successResponse(res, { verified: true });
}));

// ── Resend OTP ──
router.post('/resend-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body;
  if (!email || !purpose) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Email and purpose are required.');

  const [recent] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsed < config.otp.resendCooldownSeconds) {
      return errorResponse(res, 429, 'OTP_COOLDOWN', `Please wait ${Math.ceil(config.otp.resendCooldownSeconds - elapsed)} seconds before requesting a new OTP.`);
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
  await db.insert(otpCodes).values({ email, code: otp, purpose: purpose as any, expiresAt });

  await sendOtpEmail(email, otp, purpose);
  if (!config.isProduction) console.log(`[DEV OTP] ${purpose} OTP for ${email}: ${otp}`);

  successResponse(res, { message: 'OTP sent successfully.' });
}));

// ── Login ──
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { login, password } = req.body;

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, login), eq(users.username, login)))
    .limit(1);

  if (!user || !user.passwordHash) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid email/username or password.');
  if (user.accountStatus === 'pending_verification') return errorResponse(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first.');
  if (user.accountStatus === 'disabled') return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'Your account has been disabled. Contact your administrator.');
  if (user.employmentStatus !== 'active') return errorResponse(res, 403, 'ACCOUNT_INACTIVE', 'Your account is not active.');

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid email/username or password.');

  const authUser: AuthUser = {
    id: user.id, email: user.email, username: user.username,
    role: user.role, employeeId: user.employeeId,
    firstName: user.firstName, lastName: user.lastName,
  };

  const token = generateToken(authUser);

  res.cookie('token', token, {
    httpOnly: true, secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  successResponse(res, { user: authUser, token });
}));

// ── Forgot Password ──
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  // Always return success to prevent email enumeration
  if (!user) return successResponse(res, { message: 'If an account with this email exists, an OTP has been sent.' });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
  await db.insert(otpCodes).values({ email, code: otp, purpose: 'forgot_password', expiresAt });

  await sendOtpEmail(email, otp, 'forgot_password');
  if (!config.isProduction) console.log(`[DEV OTP] Forgot password OTP for ${email}: ${otp}`);

  successResponse(res, { message: 'If an account with this email exists, an OTP has been sent.' });
}));

// ── Reset Password ──
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, 'forgot_password'), eq(otpCodes.used, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otpRecord || otpRecord.code !== code || new Date() > otpRecord.expiresAt) {
    return errorResponse(res, 400, 'OTP_INVALID', 'Invalid or expired OTP.');
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));

  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await db.update(users).set({ passwordHash }).where(eq(users.email, email));

  await createAuditLog({
    action: 'PASSWORD_RESET', targetEntity: 'user', reason: 'Password reset via OTP',
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Password reset successfully. You can now log in.' });
}));

// ── Google Sign-In ──
router.post('/google', validate(googleAuthSchema), asyncHandler(async (req: Request, res: Response) => {
  if (!googleClient) return errorResponse(res, 503, 'GOOGLE_NOT_CONFIGURED', 'Google authentication is not configured.');

  const { credential } = req.body;
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.google.clientId });
  const payload = ticket.getPayload();

  if (!payload?.email) return errorResponse(res, 400, 'GOOGLE_AUTH_FAILED', 'Could not retrieve email from Google.');

  let [user] = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);

  if (user) {
    if (user.accountStatus === 'disabled' || user.employmentStatus !== 'active') {
      return errorResponse(res, 403, 'ACCOUNT_DISABLED', 'Your account has been disabled.');
    }
    if (!user.googleId) {
      await db.update(users).set({ googleId: payload.sub, emailVerified: true, accountStatus: 'active' }).where(eq(users.id, user.id));
    }
  } else {
    const [maxIdRow] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(users);
    const nextNum = (maxIdRow?.maxId || 0) + 1;
    const employeeId = `${config.employeeIdPrefix}-${String(nextNum).padStart(4, '0')}`;
    const username = payload.email.split('@')[0] + nextNum;

    await db.insert(users).values({
      email: payload.email,
      username,
      firstName: payload.given_name || 'User',
      lastName: payload.family_name || '',
      phone: '',
      employeeId,
      role: 'staff',
      googleId: payload.sub,
      emailVerified: true,
      accountStatus: 'active',
      profilePhoto: payload.picture || null,
    });

    [user] = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);
  }

  if (!user) return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create account.');

  const authUser: AuthUser = {
    id: user.id, email: user.email, username: user.username,
    role: user.role, employeeId: user.employeeId,
    firstName: user.firstName, lastName: user.lastName,
  };

  const token = generateToken(authUser);
  res.cookie('token', token, {
    httpOnly: true, secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  successResponse(res, { user: authUser, token });
}));

// ── Get Current User ──
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const [user] = await db
    .select({
      id: users.id, email: users.email, username: users.username,
      firstName: users.firstName, lastName: users.lastName,
      phone: users.phone, employeeId: users.employeeId,
      role: users.role, department: users.department, designation: users.designation,
      profilePhoto: users.profilePhoto, joiningDate: users.joiningDate,
      shiftId: users.shiftId, locationId: users.locationId,
      employmentStatus: users.employmentStatus, accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, req.user!.id))
    .limit(1);

  successResponse(res, { user });
}));

// ── Logout ──
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  successResponse(res, { message: 'Logged out successfully.' });
});

export default router;
