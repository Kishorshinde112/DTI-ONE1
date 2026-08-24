import { Router, type Request, type Response } from 'express';
import { eq, and, sql, desc, between } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { db } from '../../db/index.js';
import { attendanceRecords, users, shifts, officeLocations, systemSettings } from '../../db/schema.js';
import { config } from '../../config/index.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { checkInSchema, checkOutSchema } from '../../validators/index.js';
import { haversineDistance } from '../../utils/geo.js';
import { nowIST, todayIST, minutesToHuman, toIST } from '../../utils/date.js';
import {
  calculateCheckInStatus, calculateCheckOutStatus,
  getCurrentLateStreak, evaluateConsecutiveLatePolicy,
  calculateEarlyCheckoutInfo,
  type ShiftInfo,
} from './service.js';
import { getClientIp } from '../../services/audit.js';

const router = Router();
const TZ = config.timezone;

async function getEmployeeShift(userId: number): Promise<(ShiftInfo & { locationId: number | null }) | null> {
  const [user] = await db
    .select({ shiftId: users.shiftId, locationId: users.locationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.shiftId) return null;

  const [shift] = await db.select().from(shifts).where(eq(shifts.id, user.shiftId)).limit(1);
  if (!shift) return null;

  return {
    id: shift.id,
    startTime: shift.startTime,
    endTime: shift.endTime,
    graceMinutes: shift.graceMinutes,
    minFullDayMinutes: shift.minFullDayMinutes,
    halfDayMinutes: shift.halfDayMinutes,
    overtimeThresholdMinutes: shift.overtimeThresholdMinutes,
    weeklyOffDays: shift.weeklyOffDays as number[],
    locationId: user.locationId,
  };
}

async function validateGeofence(
  latitude: number, longitude: number, accuracy: number, locationId: number
): Promise<{ valid: boolean; distance: number; errorCode?: string; errorMessage?: string }> {
  const [location] = await db.select().from(officeLocations).where(eq(officeLocations.id, locationId)).limit(1);

  if (!location) return { valid: false, distance: 0, errorCode: 'NO_LOCATION', errorMessage: 'No office location assigned.' };

  const [maxAccSetting] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'max_gps_accuracy'))
    .limit(1);
  const maxAccuracy = maxAccSetting ? parseInt(maxAccSetting.value, 10) : location.maxAccuracyMeters;

  if (accuracy > maxAccuracy) {
    return {
      valid: false, distance: 0,
      errorCode: 'POOR_GPS_ACCURACY',
      errorMessage: 'Your current location is not accurate enough to verify attendance. Move to an open area or enable precise location.',
    };
  }

  const distance = haversineDistance(
    latitude, longitude,
    parseFloat(location.latitude as string), parseFloat(location.longitude as string)
  );

  if (distance > location.radiusMeters) {
    return {
      valid: false, distance,
      errorCode: 'OUTSIDE_GEOFENCE',
      errorMessage: 'You are outside the allowed office attendance area.',
    };
  }

  return { valid: true, distance };
}

// ── Check-In ──
router.post('/check-in', authenticate, validate(checkInSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { latitude, longitude, accuracy, lateReason } = req.body;
  const today = todayIST();
  const now = nowIST();

  const shiftData = await getEmployeeShift(userId);
  if (!shiftData) return errorResponse(res, 400, 'NO_SHIFT', 'No shift assigned. Contact your administrator.');
  if (!shiftData.locationId) return errorResponse(res, 400, 'NO_LOCATION', 'No office location assigned. Contact your administrator.');

  // Date check — only today
  const [existing] = await db
    .select({ id: attendanceRecords.id, checkInAt: attendanceRecords.checkInAt })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, userId), sql`${attendanceRecords.attendanceDate} = ${today}`))
    .limit(1);

  if (existing?.checkInAt) return errorResponse(res, 409, 'ALREADY_CHECKED_IN', 'You have already checked in today.');

  // Geofence validation
  const geoResult = await validateGeofence(latitude, longitude, accuracy, shiftData.locationId);
  if (!geoResult.valid) return errorResponse(res, 403, geoResult.errorCode!, geoResult.errorMessage!);

  // Calculate late status
  const checkInStatus = calculateCheckInStatus(now, shiftData);

  if (checkInStatus.requiresLateReason && !lateReason) {
    return errorResponse(res, 400, 'LATE_REASON_REQUIRED', `You are ${checkInStatus.lateMinutes} minutes late. Please provide a reason for your late arrival.`);
  }

  // Get consecutive late streak
  let lateStreak = 0;
  let shouldMarkHalfDay = false;
  let halfDayReason: string | null = null;

  if (checkInStatus.isLate) {
    const previousStreak = await getCurrentLateStreak(userId, today, shiftData);
    lateStreak = previousStreak + 1;

    const policy = await evaluateConsecutiveLatePolicy(userId, lateStreak);
    if (policy.shouldMarkHalfDay) {
      shouldMarkHalfDay = true;
      halfDayReason = 'CONSECUTIVE_LATE_POLICY';
    }
  }

  const mainStatus = shouldMarkHalfDay ? 'HALF_DAY' : 'PRESENT';
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  if (existing) {
    await db.update(attendanceRecords).set({
      checkInAt: now.toJSDate(),
      checkInLatitude: String(latitude),
      checkInLongitude: String(longitude),
      checkInAccuracy: String(accuracy),
      checkInIp: ip,
      checkInUserAgent: userAgent,
      checkInLocationVerified: true,
      isLate: checkInStatus.isLate,
      lateMinutes: checkInStatus.lateMinutes,
      isEarlyCheckin: checkInStatus.isEarlyCheckin,
      earlyCheckinMinutes: checkInStatus.earlyCheckinMinutes,
      lateReason: lateReason || null,
      lateStreak,
      mainStatus,
      halfDayReason,
      scheduledStartTime: shiftData.startTime,
      scheduledEndTime: shiftData.endTime,
      scheduledGraceMinutes: shiftData.graceMinutes,
      shiftId: shiftData.id,
      locationId: shiftData.locationId,
    }).where(eq(attendanceRecords.id, existing.id));
  } else {
    await db.insert(attendanceRecords).values({
      employeeId: userId,
      attendanceDate: new Date(today),
      shiftId: shiftData.id,
      scheduledStartTime: shiftData.startTime,
      scheduledEndTime: shiftData.endTime,
      scheduledGraceMinutes: shiftData.graceMinutes,
      checkInAt: now.toJSDate(),
      checkInLatitude: String(latitude),
      checkInLongitude: String(longitude),
      checkInAccuracy: String(accuracy),
      checkInIp: ip,
      checkInUserAgent: userAgent,
      checkInLocationVerified: true,
      isLate: checkInStatus.isLate,
      lateMinutes: checkInStatus.lateMinutes,
      isEarlyCheckin: checkInStatus.isEarlyCheckin,
      earlyCheckinMinutes: checkInStatus.earlyCheckinMinutes,
      lateReason: lateReason || null,
      lateStreak,
      mainStatus,
      halfDayReason,
      locationId: shiftData.locationId,
    });
  }

  const statusLabel = checkInStatus.isLate
    ? shouldMarkHalfDay
      ? `Half Day (${lateStreak} consecutive late days)`
      : `Late by ${checkInStatus.lateMinutes} minutes`
    : checkInStatus.isEarlyCheckin
    ? `Early by ${checkInStatus.earlyCheckinMinutes} minutes`
    : 'On Time';

  successResponse(res, {
    message: 'Checked in successfully.',
    checkInTime: now.toFormat('hh:mm a'),
    status: statusLabel,
    isLate: checkInStatus.isLate,
    lateMinutes: checkInStatus.lateMinutes,
    lateStreak,
    isHalfDay: shouldMarkHalfDay,
  });
}));

// ── Check-Out ──
router.post('/check-out', authenticate, validate(checkOutSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { latitude, longitude, accuracy, earlyCheckoutReason } = req.body;
  const today = todayIST();
  const now = nowIST();

  const [record] = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, userId), sql`${attendanceRecords.attendanceDate} = ${today}`))
    .limit(1);

  if (!record || !record.checkInAt) return errorResponse(res, 400, 'NOT_CHECKED_IN', 'You have not checked in today.');
  if (record.checkOutAt) return errorResponse(res, 409, 'ALREADY_CHECKED_OUT', 'You have already checked out today.');

  const shiftData = await getEmployeeShift(userId);
  if (!shiftData) return errorResponse(res, 400, 'NO_SHIFT', 'No shift assigned.');
  if (!shiftData.locationId) return errorResponse(res, 400, 'NO_LOCATION', 'No office location assigned.');

  // Geofence validation for checkout
  const geoResult = await validateGeofence(latitude, longitude, accuracy, shiftData.locationId);
  if (!geoResult.valid) return errorResponse(res, 403, geoResult.errorCode!, geoResult.errorMessage!);

  // Check early checkout
  const earlyInfo = calculateEarlyCheckoutInfo(now, shiftData);
  if (earlyInfo.isEarly && !earlyCheckoutReason) {
    return errorResponse(res, 400, 'EARLY_CHECKOUT_REASON_REQUIRED',
      `Your shift ends at ${shiftData.endTime.substring(0, 5)}. You are checking out ${earlyInfo.earlyMinutes} minutes early. Please provide a reason.`);
  }

  const checkInTime = toIST(record.checkInAt);
  const checkOutStatus = calculateCheckOutStatus(checkInTime, now, shiftData);

  // Keep half-day status if already marked by late policy
  let finalStatus = checkOutStatus.mainStatus;
  if (record.mainStatus === 'HALF_DAY' && record.halfDayReason === 'CONSECUTIVE_LATE_POLICY') {
    finalStatus = 'HALF_DAY';
  }

  const ip = getClientIp(req);

  await db.update(attendanceRecords).set({
    checkOutAt: now.toJSDate(),
    checkOutLatitude: String(latitude),
    checkOutLongitude: String(longitude),
    checkOutAccuracy: String(accuracy),
    checkOutIp: ip,
    checkOutUserAgent: req.headers['user-agent'] || '',
    checkOutLocationVerified: true,
    workedMinutes: checkOutStatus.workedMinutes,
    earlyCheckoutMinutes: checkOutStatus.earlyCheckoutMinutes,
    isEarlyCheckout: checkOutStatus.isEarlyCheckout,
    overtimeMinutes: checkOutStatus.overtimeMinutes,
    hasOvertime: checkOutStatus.hasOvertime,
    earlyCheckoutReason: earlyCheckoutReason || null,
    mainStatus: finalStatus as any,
  }).where(eq(attendanceRecords.id, record.id));

  successResponse(res, {
    message: 'Checked out successfully.',
    checkOutTime: now.toFormat('hh:mm a'),
    workedDuration: minutesToHuman(checkOutStatus.workedMinutes),
    overtime: checkOutStatus.hasOvertime ? minutesToHuman(checkOutStatus.overtimeMinutes) : null,
    status: finalStatus,
  });
}));

// ── Get Today's Attendance ──
router.get('/today', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const today = todayIST();
  const [record] = await db
    .select()
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, req.user!.id), sql`${attendanceRecords.attendanceDate} = ${today}`))
    .limit(1);

  const shiftData = await getEmployeeShift(req.user!.id);

  successResponse(res, {
    attendance: record || null,
    shift: shiftData ? {
      id: shiftData.id,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      graceMinutes: shiftData.graceMinutes,
      weeklyOffDays: shiftData.weeklyOffDays,
    } : null,
    today,
    currentTime: nowIST().toFormat('hh:mm a'),
  });
}));

// ── Get Attendance History ──
router.get('/history', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const month = parseInt(req.query.month as string) || nowIST().month;
  const year = parseInt(req.query.year as string) || nowIST().year;
  const status = req.query.status as string;

  const startDate = DateTime.fromObject({ year, month, day: 1 }, { zone: TZ }).toFormat('yyyy-MM-dd');
  const endDate = DateTime.fromObject({ year, month, day: 1 }, { zone: TZ }).endOf('month').toFormat('yyyy-MM-dd');

  let query = db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, userId),
        sql`${attendanceRecords.attendanceDate} >= ${startDate}`,
        sql`${attendanceRecords.attendanceDate} <= ${endDate}`,
        ...(status ? [eq(attendanceRecords.mainStatus, status as any)] : []),
      )
    )
    .orderBy(desc(attendanceRecords.attendanceDate));

  const records = await query;

  // Summary
  let presentDays = 0, halfDays = 0, leaveDays = 0, lateDays = 0;
  let totalWorked = 0, totalOvertime = 0, absentDays = 0;

  for (const r of records) {
    if (r.mainStatus === 'FULL_DAY' || r.mainStatus === 'PRESENT') presentDays++;
    if (r.mainStatus === 'HALF_DAY') halfDays++;
    if (['LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE'].includes(r.mainStatus)) leaveDays++;
    if (r.mainStatus === 'ABSENT') absentDays++;
    if (r.isLate) lateDays++;
    totalWorked += r.workedMinutes || 0;
    totalOvertime += r.overtimeMinutes || 0;
  }

  successResponse(res, {
    records,
    summary: {
      presentDays, halfDays, leaveDays, lateDays, absentDays,
      totalWorkedHours: minutesToHuman(totalWorked),
      totalOvertime: minutesToHuman(totalOvertime),
    },
    month, year,
  });
}));

export default router;
