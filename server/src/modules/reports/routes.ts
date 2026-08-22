import { Router, type Request, type Response } from 'express';
import { eq, and, desc, sql, count, like, or } from 'drizzle-orm';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';
import { db } from '../../db/index.js';
import { attendanceRecords, attendanceAdjustments, users, shifts } from '../../db/schema.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { attendanceAdjustSchema } from '../../validators/index.js';
import { nowIST, minutesToHuman, todayIST } from '../../utils/date.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';
import { config } from '../../config/index.js';

const router = Router();
const TZ = config.timezone;

// ── Admin: Today's Attendance ──
router.get('/today', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const today = todayIST();

  const records = await db
    .select({
      id: attendanceRecords.id,
      employeeId: attendanceRecords.employeeId,
      attendanceDate: attendanceRecords.attendanceDate,
      checkInAt: attendanceRecords.checkInAt,
      checkOutAt: attendanceRecords.checkOutAt,
      mainStatus: attendanceRecords.mainStatus,
      isLate: attendanceRecords.isLate,
      lateMinutes: attendanceRecords.lateMinutes,
      workedMinutes: attendanceRecords.workedMinutes,
      overtimeMinutes: attendanceRecords.overtimeMinutes,
      hasOvertime: attendanceRecords.hasOvertime,
      checkInLocationVerified: attendanceRecords.checkInLocationVerified,
      scheduledStartTime: attendanceRecords.scheduledStartTime,
      scheduledEndTime: attendanceRecords.scheduledEndTime,
    })
    .from(attendanceRecords)
    .where(sql`${attendanceRecords.attendanceDate} = ${today}`)
    .orderBy(desc(attendanceRecords.checkInAt));

  const employeeIds = records.map(r => r.employeeId);
  let employeeMap = new Map<number, { firstName: string; lastName: string; employeeId: string; shiftId: number | null }>();

  if (employeeIds.length > 0) {
    const employees = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, employeeId: users.employeeId, shiftId: users.shiftId })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})`);
    for (const e of employees) employeeMap.set(e.id, e);
  }

  const enriched = records.map(r => ({
    ...r,
    employeeName: employeeMap.get(r.employeeId)
      ? `${employeeMap.get(r.employeeId)!.firstName} ${employeeMap.get(r.employeeId)!.lastName}`
      : 'Unknown',
    employeeCode: employeeMap.get(r.employeeId)?.employeeId || '',
    workedDuration: minutesToHuman(r.workedMinutes || 0),
    overtimeDuration: minutesToHuman(r.overtimeMinutes || 0),
  }));

  successResponse(res, { attendance: enriched, date: today });
}));

// ── Admin: Attendance List with Filters ──
router.get('/list', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
  const offset = (page - 1) * limit;
  const { from, to, employeeId, status, late, overtime, search } = req.query;

  const conditions = [];

  if (from) conditions.push(sql`${attendanceRecords.attendanceDate} >= ${from as string}`);
  if (to) conditions.push(sql`${attendanceRecords.attendanceDate} <= ${to as string}`);
  if (employeeId) conditions.push(eq(attendanceRecords.employeeId, parseInt(employeeId as string)));
  if (status) conditions.push(eq(attendanceRecords.mainStatus, status as any));
  if (late === 'true') conditions.push(eq(attendanceRecords.isLate, true));
  if (overtime === 'true') conditions.push(eq(attendanceRecords.hasOvertime, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ total: count() }).from(attendanceRecords).where(whereClause);

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(whereClause)
    .orderBy(desc(attendanceRecords.attendanceDate), desc(attendanceRecords.checkInAt))
    .limit(limit)
    .offset(offset);

  // Get employee names
  const allEmpIds = [...new Set(records.map(r => r.employeeId))];
  const empMap = new Map<number, { firstName: string; lastName: string; employeeId: string }>();
  if (allEmpIds.length > 0) {
    const emps = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, employeeId: users.employeeId })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(allEmpIds.map(id => sql`${id}`), sql`, `)})`);
    for (const e of emps) empMap.set(e.id, e);
  }

  const enriched = records.map(r => ({
    ...r,
    employeeName: empMap.get(r.employeeId) ? `${empMap.get(r.employeeId)!.firstName} ${empMap.get(r.employeeId)!.lastName}` : '',
    employeeCode: empMap.get(r.employeeId)?.employeeId || '',
    workedDuration: minutesToHuman(r.workedMinutes || 0),
    overtimeDuration: minutesToHuman(r.overtimeMinutes || 0),
  }));

  successResponse(res, {
    attendance: enriched,
    pagination: { page, limit, total: totalResult.total, totalPages: Math.ceil(totalResult.total / limit) },
  });
}));

// ── Admin: Adjust Attendance ──
router.patch('/:id', authenticate, requireAdmin, validate(attendanceAdjustSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [record] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id)).limit(1);
  if (!record) return errorResponse(res, 404, 'NOT_FOUND', 'Attendance record not found.');

  const { reason, ...changes } = req.body;
  const updateData: Record<string, unknown> = {};
  const adjustments: { fieldName: string; oldValue: string; newValue: string }[] = [];

  for (const [key, val] of Object.entries(changes)) {
    if (val !== undefined) {
      const oldVal = (record as Record<string, unknown>)[key];
      if (String(oldVal) !== String(val)) {
        updateData[key] = val;
        adjustments.push({ fieldName: key, oldValue: String(oldVal ?? ''), newValue: String(val) });
      }
    }
  }

  if (adjustments.length === 0) return successResponse(res, { message: 'No changes detected.' });

  await db.update(attendanceRecords).set(updateData as any).where(eq(attendanceRecords.id, id));

  for (const adj of adjustments) {
    await db.insert(attendanceAdjustments).values({
      attendanceId: id,
      adjustedBy: req.user!.id,
      fieldName: adj.fieldName,
      oldValue: adj.oldValue,
      newValue: adj.newValue,
      reason,
    });
  }

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'ATTENDANCE_ADJUSTED', targetEntity: 'attendance_record', targetId: id,
    oldValue: Object.fromEntries(adjustments.map(a => [a.fieldName, a.oldValue])),
    newValue: Object.fromEntries(adjustments.map(a => [a.fieldName, a.newValue])),
    reason, ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Attendance adjusted successfully.' });
}));

// ── Admin: Dashboard Summary ──
router.get('/dashboard', authenticate, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const today = todayIST();

  const [totalEmployees] = await db.select({ total: count() }).from(users).where(eq(users.employmentStatus, 'active'));

  const todayRecords = await db
    .select({
      mainStatus: attendanceRecords.mainStatus,
      isLate: attendanceRecords.isLate,
      hasOvertime: attendanceRecords.hasOvertime,
    })
    .from(attendanceRecords)
    .where(sql`${attendanceRecords.attendanceDate} = ${today}`);

  let present = 0, late = 0, onLeave = 0, halfDay = 0, overtime = 0;
  for (const r of todayRecords) {
    if (['PRESENT', 'FULL_DAY'].includes(r.mainStatus)) present++;
    if (r.mainStatus === 'HALF_DAY') halfDay++;
    if (['LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE'].includes(r.mainStatus)) onLeave++;
    if (r.isLate) late++;
    if (r.hasOvertime) overtime++;
  }

  const checkedIn = todayRecords.length;
  const notCheckedIn = totalEmployees.total - checkedIn;

  successResponse(res, {
    totalEmployees: totalEmployees.total,
    present, late, onLeave, halfDay, overtime, notCheckedIn,
    date: today,
  });
}));

// ── Admin: Export Excel ──
router.get('/export', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { from, to, employeeId, status, month, year } = req.query;

  const conditions = [];
  let fromDate: string, toDate: string;

  if (month && year) {
    const dt = DateTime.fromObject({ year: parseInt(year as string), month: parseInt(month as string), day: 1 }, { zone: TZ });
    fromDate = dt.toFormat('yyyy-MM-dd');
    toDate = dt.endOf('month').toFormat('yyyy-MM-dd');
  } else {
    fromDate = (from as string) || DateTime.now().setZone(TZ).startOf('month').toFormat('yyyy-MM-dd');
    toDate = (to as string) || todayIST();
  }

  conditions.push(sql`${attendanceRecords.attendanceDate} >= ${fromDate}`);
  conditions.push(sql`${attendanceRecords.attendanceDate} <= ${toDate}`);
  if (employeeId) conditions.push(eq(attendanceRecords.employeeId, parseInt(employeeId as string)));
  if (status) conditions.push(eq(attendanceRecords.mainStatus, status as any));

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(and(...conditions))
    .orderBy(attendanceRecords.attendanceDate, attendanceRecords.employeeId);

  const allEmpIds = [...new Set(records.map(r => r.employeeId))];
  const empMap = new Map<number, { firstName: string; lastName: string; employeeId: string; username: string }>();
  if (allEmpIds.length > 0) {
    const emps = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, employeeId: users.employeeId, username: users.username })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(allEmpIds.map(id => sql`${id}`), sql`, `)})`);
    for (const e of emps) empMap.set(e.id, e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DTI Pulse';
  const sheet = workbook.addWorksheet('Attendance Report');

  sheet.columns = [
    { header: 'Employee ID', key: 'empId', width: 14 },
    { header: 'Employee Name', key: 'empName', width: 22 },
    { header: 'Username', key: 'username', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Scheduled In', key: 'schedIn', width: 12 },
    { header: 'Actual In', key: 'actualIn', width: 12 },
    { header: 'Late Minutes', key: 'lateMin', width: 12 },
    { header: 'Scheduled Out', key: 'schedOut', width: 12 },
    { header: 'Actual Out', key: 'actualOut', width: 12 },
    { header: 'Early Checkout', key: 'earlyOut', width: 14 },
    { header: 'Worked', key: 'worked', width: 10 },
    { header: 'Overtime', key: 'overtime', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Late Reason', key: 'lateReason', width: 25 },
    { header: 'Notes', key: 'notes', width: 20 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const r of records) {
    const emp = empMap.get(r.employeeId);
    const checkIn = r.checkInAt ? DateTime.fromJSDate(r.checkInAt).setZone(TZ).toFormat('hh:mm a') : '';
    const checkOut = r.checkOutAt ? DateTime.fromJSDate(r.checkOutAt).setZone(TZ).toFormat('hh:mm a') : '';

    sheet.addRow({
      empId: emp?.employeeId || '',
      empName: emp ? `${emp.firstName} ${emp.lastName}` : '',
      username: emp?.username || '',
      date: r.attendanceDate,
      schedIn: r.scheduledStartTime?.substring(0, 5) || '',
      actualIn: checkIn,
      lateMin: r.lateMinutes || 0,
      schedOut: r.scheduledEndTime?.substring(0, 5) || '',
      actualOut: checkOut,
      earlyOut: r.earlyCheckoutMinutes || 0,
      worked: minutesToHuman(r.workedMinutes || 0),
      overtime: minutesToHuman(r.overtimeMinutes || 0),
      status: r.mainStatus,
      lateReason: r.lateReason || '',
      notes: r.adminNote || r.employeeNote || '',
    });
  }

  const monthName = DateTime.fromISO(fromDate).toFormat('MMMM_yyyy');
  const filename = `DTI_Attendance_${monthName}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}));

// ── Admin: CSV Export ──
router.get('/export-csv', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { from, to, employeeId, status, month, year } = req.query;

  const conditions = [];
  let fromDate: string, toDate: string;

  if (month && year) {
    const dt = DateTime.fromObject({ year: parseInt(year as string), month: parseInt(month as string), day: 1 }, { zone: TZ });
    fromDate = dt.toFormat('yyyy-MM-dd');
    toDate = dt.endOf('month').toFormat('yyyy-MM-dd');
  } else {
    fromDate = (from as string) || DateTime.now().setZone(TZ).startOf('month').toFormat('yyyy-MM-dd');
    toDate = (to as string) || todayIST();
  }

  conditions.push(sql`${attendanceRecords.attendanceDate} >= ${fromDate}`);
  conditions.push(sql`${attendanceRecords.attendanceDate} <= ${toDate}`);
  if (employeeId) conditions.push(eq(attendanceRecords.employeeId, parseInt(employeeId as string)));
  if (status) conditions.push(eq(attendanceRecords.mainStatus, status as any));

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(and(...conditions))
    .orderBy(attendanceRecords.attendanceDate, attendanceRecords.employeeId);

  const allEmpIds = [...new Set(records.map(r => r.employeeId))];
  const empMap = new Map<number, { firstName: string; lastName: string; employeeId: string }>();
  if (allEmpIds.length > 0) {
    const emps = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, employeeId: users.employeeId })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(allEmpIds.map(id => sql`${id}`), sql`, `)})`);
    for (const e of emps) empMap.set(e.id, e);
  }

  const header = 'Employee ID,Employee Name,Date,Check In,Check Out,Late Min,Worked,Overtime,Status\n';
  let csv = header;

  for (const r of records) {
    const emp = empMap.get(r.employeeId);
    const checkIn = r.checkInAt ? DateTime.fromJSDate(r.checkInAt).setZone(TZ).toFormat('hh:mm a') : '';
    const checkOut = r.checkOutAt ? DateTime.fromJSDate(r.checkOutAt).setZone(TZ).toFormat('hh:mm a') : '';
    csv += `${emp?.employeeId || ''},"${emp ? `${emp.firstName} ${emp.lastName}` : ''}",${r.attendanceDate},${checkIn},${checkOut},${r.lateMinutes || 0},${minutesToHuman(r.workedMinutes || 0)},${minutesToHuman(r.overtimeMinutes || 0)},${r.mainStatus}\n`;
  }

  const monthName = DateTime.fromISO(fromDate).toFormat('MMMM_yyyy');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="DTI_Attendance_${monthName}.csv"`);
  res.send(csv);
}));

export default router;
