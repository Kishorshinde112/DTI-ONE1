import { Router, type Request, type Response } from 'express';
import { eq, and, desc, sql, count, or } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { db } from '../../db/index.js';
import { leaveRequests, leaveTypes, attendanceRecords } from '../../db/schema.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { leaveRequestSchema } from '../../validators/index.js';
import { todayIST, nowIST } from '../../utils/date.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';
import { config } from '../../config/index.js';

const router = Router();
const TZ = config.timezone;

// ── Staff: Get Leave Types ──
router.get('/types', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const types = await db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true));
  successResponse(res, { leaveTypes: types });
}));

// ── Staff: Submit Leave Request ──
router.post('/request', authenticate, validate(leaveRequestSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { leaveTypeId, fromDate, toDate, reason } = req.body;

  const today = todayIST();
  if (fromDate < today) return errorResponse(res, 400, 'PAST_DATE', 'Cannot request leave for past dates.');

  const from = DateTime.fromISO(fromDate, { zone: TZ });
  const to = DateTime.fromISO(toDate, { zone: TZ });
  if (to < from) return errorResponse(res, 400, 'INVALID_RANGE', 'End date must be after start date.');

  const totalDays = Math.ceil(to.diff(from, 'days').days) + 1;

  const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).limit(1);
  if (!type || !type.isActive) return errorResponse(res, 400, 'INVALID_LEAVE_TYPE', 'Invalid leave type.');

  // Check overlapping
  const overlapping = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.employeeId, userId),
      sql`${leaveRequests.status} != 'rejected'`,
      sql`${leaveRequests.fromDate} <= ${toDate}`,
      sql`${leaveRequests.toDate} >= ${fromDate}`,
    ))
    .limit(1);

  if (overlapping.length > 0) return errorResponse(res, 409, 'LEAVE_OVERLAP', 'You already have a leave request for these dates.');

  const status = type.requiresApproval ? 'pending' : 'approved';

  await db.insert(leaveRequests).values({
    employeeId: userId,
    leaveTypeId,
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    totalDays,
    reason,
    status: status as any,
  });

  if (status === 'approved') {
    let d = from;
    while (d <= to) {
      const dateStr = d.toFormat('yyyy-MM-dd');
      const leaveStatus = type.isPaid ? 'PAID_LEAVE' : 'UNPAID_LEAVE';
      const [existing] = await db.select({ id: attendanceRecords.id })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, userId), sql`${attendanceRecords.attendanceDate} = ${dateStr}`))
        .limit(1);

      if (!existing) {
        await db.insert(attendanceRecords).values({
          employeeId: userId,
          attendanceDate: new Date(dateStr),
          mainStatus: leaveStatus as any,
        });
      }
      d = d.plus({ days: 1 });
    }
  }

  successResponse(res, { message: `Leave request ${status === 'approved' ? 'approved automatically' : 'submitted for approval'}.` }, 201);
}));

// ── Staff: My Leave History ──
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const year = parseInt(req.query.year as string) || nowIST().year;

  const requests = await db
    .select({
      id: leaveRequests.id,
      leaveTypeId: leaveRequests.leaveTypeId,
      fromDate: leaveRequests.fromDate,
      toDate: leaveRequests.toDate,
      totalDays: leaveRequests.totalDays,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      reviewNote: leaveRequests.reviewNote,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.employeeId, userId),
      sql`YEAR(${leaveRequests.fromDate}) = ${year}`,
    ))
    .orderBy(desc(leaveRequests.createdAt));

  const types = await db.select().from(leaveTypes);
  const typeMap = new Map(types.map(t => [t.id, t]));

  const enriched = requests.map(r => ({
    ...r,
    leaveTypeName: typeMap.get(r.leaveTypeId)?.name || 'Unknown',
    leaveTypeCode: typeMap.get(r.leaveTypeId)?.code || '',
  }));

  successResponse(res, { leaves: enriched, year });
}));

// ── Admin: All Leave Requests ──
router.get('/admin', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;

  const conditions = [];
  if (status) conditions.push(eq(leaveRequests.status, status as any));

  const [totalResult] = await db.select({ total: count() }).from(leaveRequests).where(conditions.length ? and(...conditions) : undefined);

  const requests = await db
    .select()
    .from(leaveRequests)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leaveRequests.createdAt))
    .limit(limit)
    .offset(offset);

  successResponse(res, {
    leaves: requests,
    pagination: { page, limit, total: totalResult.total, totalPages: Math.ceil(totalResult.total / limit) },
  });
}));

// ── Admin: Review Leave ──
router.patch('/admin/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { status, reviewNote } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return errorResponse(res, 400, 'INVALID_STATUS', 'Status must be approved or rejected.');
  }

  const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  if (!request) return errorResponse(res, 404, 'NOT_FOUND', 'Leave request not found.');

  await db.update(leaveRequests).set({
    status: status as any,
    reviewedBy: req.user!.id,
    reviewNote: reviewNote || null,
    reviewedAt: new Date(),
  }).where(eq(leaveRequests.id, id));

  if (status === 'approved') {
    const [type] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, request.leaveTypeId)).limit(1);
    const leaveStatus = type?.isPaid ? 'PAID_LEAVE' : 'UNPAID_LEAVE';

    let d = DateTime.fromJSDate(request.fromDate as unknown as Date).setZone(TZ);
    const end = DateTime.fromJSDate(request.toDate as unknown as Date).setZone(TZ);
    while (d <= end) {
      const dateStr = d.toFormat('yyyy-MM-dd');
      const [existing] = await db.select({ id: attendanceRecords.id })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, request.employeeId), sql`${attendanceRecords.attendanceDate} = ${dateStr}`))
        .limit(1);

      if (!existing) {
        await db.insert(attendanceRecords).values({
          employeeId: request.employeeId,
          attendanceDate: new Date(dateStr),
          mainStatus: leaveStatus as any,
        });
      } else {
        await db.update(attendanceRecords).set({ mainStatus: leaveStatus as any })
          .where(eq(attendanceRecords.id, existing.id));
      }
      d = d.plus({ days: 1 });
    }
  }

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: `LEAVE_${status.toUpperCase()}`, targetEntity: 'leave_request', targetId: id,
    newValue: { status, reviewNote },
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: `Leave request ${status}.` });
}));

export default router;
