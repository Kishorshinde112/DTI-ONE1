import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/;

export const signupSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20),
  password: z.string().min(8).max(128).regex(passwordRegex, 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character, and no spaces'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.enum(['registration', 'forgot_password', 'verification']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(128).regex(passwordRegex),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
});

export const checkInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000),
  lateReason: z.string().max(1000).optional(),
});

export const checkOutSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000),
  earlyCheckoutReason: z.string().max(1000).optional(),
});

export const leaveRequestSchema = z.object({
  leaveTypeId: z.number().int().positive(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(1000),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export const employeeCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(20),
  password: z.string().min(8).max(128).regex(passwordRegex).optional(),
  role: z.enum(['admin', 'staff']).default('staff'),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  shiftId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const employeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  shiftId: z.number().int().positive().nullable().optional(),
  locationId: z.number().int().positive().nullable().optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employmentStatus: z.enum(['active', 'inactive', 'terminated']).optional(),
  accountStatus: z.enum(['active', 'disabled']).optional(),
  employeeId: z.string().max(20).optional(),
});

export const shiftSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  graceMinutes: z.number().int().min(0).max(120).default(15),
  minFullDayMinutes: z.number().int().min(60).max(1440).default(480),
  halfDayMinutes: z.number().int().min(30).max(720).default(240),
  overtimeThresholdMinutes: z.number().int().min(0).max(120).default(0),
  earlyCheckinAllowed: z.boolean().default(true),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
});

export const locationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(10).max(5000).default(100),
  maxAccuracyMeters: z.number().int().min(10).max(500).default(150),
});

export const attendanceAdjustSchema = z.object({
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  mainStatus: z.enum([
    'PRESENT', 'FULL_DAY', 'HALF_DAY', 'LEAVE', 'PAID_LEAVE',
    'UNPAID_LEAVE', 'SICK_LEAVE', 'ABSENT', 'WEEKLY_OFF', 'HOLIDAY',
  ]).optional(),
  isLate: z.boolean().optional(),
  lateMinutes: z.number().int().min(0).optional(),
  overtimeMinutes: z.number().int().min(0).optional(),
  workedMinutes: z.number().int().min(0).optional(),
  adminNote: z.string().max(1000).optional(),
  reason: z.string().min(1).max(1000),
});
