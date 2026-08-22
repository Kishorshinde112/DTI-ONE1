import { DateTime } from 'luxon';
import { eq, and, desc, sql, ne } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { attendanceRecords, holidays, leaveRequests, systemSettings } from '../../db/schema.js';
import { config } from '../../config/index.js';
import { nowIST, todayIST, parseTimeToMinutes } from '../../utils/date.js';

const TZ = config.timezone;

export interface ShiftInfo {
  id: number;
  startTime: string; // HH:mm:ss
  endTime: string;
  graceMinutes: number;
  minFullDayMinutes: number;
  halfDayMinutes: number;
  overtimeThresholdMinutes: number;
  weeklyOffDays: number[];
}

export interface AttendanceCalcResult {
  isLate: boolean;
  lateMinutes: number;
  isEarlyCheckin: boolean;
  earlyCheckinMinutes: number;
  requiresLateReason: boolean;
}

export function calculateCheckInStatus(
  checkInTime: DateTime,
  shift: ShiftInfo
): AttendanceCalcResult {
  const startMinutes = parseTimeToMinutes(shift.startTime);
  const checkInMinutes = checkInTime.hour * 60 + checkInTime.minute;
  const graceEnd = startMinutes + shift.graceMinutes;

  if (checkInMinutes < startMinutes) {
    return {
      isLate: false,
      lateMinutes: 0,
      isEarlyCheckin: true,
      earlyCheckinMinutes: startMinutes - checkInMinutes,
      requiresLateReason: false,
    };
  }

  if (checkInMinutes <= graceEnd) {
    return {
      isLate: false,
      lateMinutes: 0,
      isEarlyCheckin: false,
      earlyCheckinMinutes: 0,
      requiresLateReason: false,
    };
  }

  const lateMinutes = checkInMinutes - startMinutes;
  return {
    isLate: true,
    lateMinutes,
    isEarlyCheckin: false,
    earlyCheckinMinutes: 0,
    requiresLateReason: true,
  };
}

export function calculateCheckOutStatus(
  checkInTime: DateTime,
  checkOutTime: DateTime,
  shift: ShiftInfo
) {
  const endMinutes = parseTimeToMinutes(shift.endTime);
  const checkOutMinutes = checkOutTime.hour * 60 + checkOutTime.minute;

  const workedMinutes = Math.floor(checkOutTime.diff(checkInTime, 'minutes').minutes);

  let earlyCheckoutMinutes = 0;
  let isEarlyCheckout = false;
  let overtimeMinutes = 0;
  let hasOvertime = false;

  if (checkOutMinutes < endMinutes) {
    earlyCheckoutMinutes = endMinutes - checkOutMinutes;
    isEarlyCheckout = true;
  } else if (checkOutMinutes > endMinutes) {
    const rawOvertime = checkOutMinutes - endMinutes;
    if (rawOvertime > shift.overtimeThresholdMinutes) {
      overtimeMinutes = rawOvertime;
      hasOvertime = true;
    }
  }

  let mainStatus: string = 'FULL_DAY';
  if (workedMinutes < shift.halfDayMinutes) {
    mainStatus = 'HALF_DAY';
  } else if (workedMinutes < shift.minFullDayMinutes) {
    mainStatus = 'HALF_DAY';
  }

  return {
    workedMinutes: Math.max(0, workedMinutes),
    earlyCheckoutMinutes,
    isEarlyCheckout,
    overtimeMinutes,
    hasOvertime,
    mainStatus,
    requiresEarlyCheckoutReason: isEarlyCheckout,
  };
}

export async function getCurrentLateStreak(
  employeeId: number,
  beforeDate: string,
  shift: ShiftInfo
): Promise<number> {
  const records = await db
    .select({
      attendanceDate: attendanceRecords.attendanceDate,
      isLate: attendanceRecords.isLate,
      mainStatus: attendanceRecords.mainStatus,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        sql`${attendanceRecords.attendanceDate} < ${beforeDate}`,
        sql`${attendanceRecords.mainStatus} NOT IN ('WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE')`
      )
    )
    .orderBy(desc(attendanceRecords.attendanceDate))
    .limit(20);

  // Also exclude days that were approved leave
  const approvedLeaves = await db
    .select({ fromDate: leaveRequests.fromDate, toDate: leaveRequests.toDate })
    .from(leaveRequests)
    .where(and(eq(leaveRequests.employeeId, employeeId), eq(leaveRequests.status, 'approved')))
    .limit(50);

  const leaveDates = new Set<string>();
  for (const leave of approvedLeaves) {
    let d = DateTime.fromJSDate(leave.fromDate as unknown as Date).setZone(TZ);
    const end = DateTime.fromJSDate(leave.toDate as unknown as Date).setZone(TZ);
    while (d <= end) {
      leaveDates.add(d.toFormat('yyyy-MM-dd'));
      d = d.plus({ days: 1 });
    }
  }

  const holidayRecords = await db.select({ date: holidays.date }).from(holidays).limit(100);
  const holidayDates = new Set(holidayRecords.map(h => DateTime.fromJSDate(h.date as unknown as Date).toFormat('yyyy-MM-dd')));

  let streak = 0;
  for (const record of records) {
    const dateStr = DateTime.fromJSDate(record.attendanceDate as unknown as Date).toFormat('yyyy-MM-dd');
    const dt = DateTime.fromISO(dateStr, { zone: TZ });
    const dayOfWeek = dt.weekday % 7; // 0=Sunday per JS convention

    if (shift.weeklyOffDays.includes(dayOfWeek)) continue;
    if (holidayDates.has(dateStr)) continue;
    if (leaveDates.has(dateStr)) continue;

    if (record.isLate) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function evaluateConsecutiveLatePolicy(
  employeeId: number,
  currentLateStreak: number
): Promise<{ shouldMarkHalfDay: boolean; threshold: number }> {
  const [setting] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'consecutive_late_threshold'))
    .limit(1);

  const threshold = setting ? parseInt(setting.value, 10) : 3;

  return {
    shouldMarkHalfDay: currentLateStreak >= threshold,
    threshold,
  };
}

export function calculateEarlyCheckoutInfo(
  currentTime: DateTime,
  shift: ShiftInfo
): { isEarly: boolean; earlyMinutes: number } {
  const endMinutes = parseTimeToMinutes(shift.endTime);
  const currentMinutes = currentTime.hour * 60 + currentTime.minute;

  if (currentMinutes < endMinutes) {
    return { isEarly: true, earlyMinutes: endMinutes - currentMinutes };
  }
  return { isEarly: false, earlyMinutes: 0 };
}
