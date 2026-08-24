import { Router, type Request, type Response } from 'express';
import { eq, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { shifts, users } from '../../db/schema.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { shiftSchema } from '../../validators/index.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';

const router = Router();
router.use(authenticate, requireAdmin);

// ── List Shifts ──
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const shiftList = await db.select().from(shifts).orderBy(shifts.name);

  const enriched = [];
  for (const shift of shiftList) {
    const [empCount] = await db.select({ total: count() }).from(users).where(eq(users.shiftId, shift.id));
    enriched.push({ ...shift, employeeCount: empCount.total });
  }

  successResponse(res, { shifts: enriched });
}));

// ── Get Shift ──
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [shift] = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  if (!shift) return errorResponse(res, 404, 'NOT_FOUND', 'Shift not found.');
  successResponse(res, { shift });
}));

// ── Create Shift ──
router.post('/', validate(shiftSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  await db.insert(shifts).values({
    name: data.name,
    startTime: data.startTime + ':00',
    endTime: data.endTime + ':00',
    graceMinutes: data.graceMinutes,
    minFullDayMinutes: data.minFullDayMinutes,
    halfDayMinutes: data.halfDayMinutes,
    overtimeThresholdMinutes: data.overtimeThresholdMinutes,
    earlyCheckinAllowed: data.earlyCheckinAllowed,
    weeklyOffDays: data.weeklyOffDays,
  });

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'SHIFT_CREATED', targetEntity: 'shift',
    newValue: data, ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Shift created successfully.' }, 201);
}));

// ── Update Shift ──
router.patch('/:id', validate(shiftSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [existing] = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
  if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Shift not found.');

  const data = req.body;
  await db.update(shifts).set({
    name: data.name,
    startTime: data.startTime.length === 5 ? data.startTime + ':00' : data.startTime,
    endTime: data.endTime.length === 5 ? data.endTime + ':00' : data.endTime,
    graceMinutes: data.graceMinutes,
    minFullDayMinutes: data.minFullDayMinutes,
    halfDayMinutes: data.halfDayMinutes,
    overtimeThresholdMinutes: data.overtimeThresholdMinutes,
    earlyCheckinAllowed: data.earlyCheckinAllowed,
    weeklyOffDays: data.weeklyOffDays,
  }).where(eq(shifts.id, id));

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'SHIFT_UPDATED', targetEntity: 'shift', targetId: id,
    oldValue: { name: existing.name, startTime: existing.startTime, endTime: existing.endTime },
    newValue: data, ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Shift updated successfully.' });
}));

// ── Delete Shift ──
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [empCount] = await db.select({ total: count() }).from(users).where(eq(users.shiftId, id));
  if (empCount.total > 0) {
    return errorResponse(res, 400, 'SHIFT_IN_USE', `Cannot delete shift. ${empCount.total} employees are assigned to it.`);
  }

  await db.update(shifts).set({ isActive: false }).where(eq(shifts.id, id));
  successResponse(res, { message: 'Shift deactivated.' });
}));

export default router;
