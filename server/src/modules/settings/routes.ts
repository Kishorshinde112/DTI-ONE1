import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { systemSettings, holidays } from '../../db/schema.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';

const router = Router();

// ── Get All Settings (admin) ──
router.get('/', authenticate, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const settings = await db.select().from(systemSettings);
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;
  successResponse(res, { settings: settingsMap });
}));

// ── Update Setting ──
router.patch('/:key', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const { value } = req.body;
  if (value === undefined) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Value is required.');

  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);

  if (existing) {
    await db.update(systemSettings).set({ value: String(value) }).where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value: String(value) });
  }

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'SETTING_UPDATED', targetEntity: 'system_setting',
    oldValue: existing ? { value: existing.value } : undefined,
    newValue: { key, value: String(value) },
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Setting updated.' });
}));

// ── Holidays CRUD ──
router.get('/holidays', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const list = await db.select().from(holidays).orderBy(holidays.date);
  successResponse(res, { holidays: list });
}));

router.post('/holidays', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, date, isOptional } = req.body;
  if (!name || !date) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Name and date are required.');

  await db.insert(holidays).values({ name, date: new Date(date), isOptional: isOptional || false });
  successResponse(res, { message: 'Holiday added.' }, 201);
}));

router.delete('/holidays/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await db.delete(holidays).where(eq(holidays.id, id));
  successResponse(res, { message: 'Holiday removed.' });
}));

// ── Public: Get basic settings for frontend ──
router.get('/public', asyncHandler(async (_req: Request, res: Response) => {
  const settings = await db.select().from(systemSettings);
  const map: Record<string, string> = {};
  for (const s of settings) {
    if (['company_name', 'timezone', 'allow_signup'].includes(s.key)) {
      map[s.key] = s.value;
    }
  }
  successResponse(res, { settings: map });
}));

export default router;
