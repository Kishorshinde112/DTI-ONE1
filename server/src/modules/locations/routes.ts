import { Router, type Request, type Response } from 'express';
import { eq, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { officeLocations, users } from '../../db/schema.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { locationSchema } from '../../validators/index.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const locations = await db.select().from(officeLocations).orderBy(officeLocations.name);

  const enriched = [];
  for (const loc of locations) {
    const [empCount] = await db.select({ total: count() }).from(users).where(eq(users.locationId, loc.id));
    enriched.push({ ...loc, employeeCount: empCount.total });
  }

  successResponse(res, { locations: enriched });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [location] = await db.select().from(officeLocations).where(eq(officeLocations.id, id)).limit(1);
  if (!location) return errorResponse(res, 404, 'NOT_FOUND', 'Location not found.');
  successResponse(res, { location });
}));

router.post('/', validate(locationSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  await db.insert(officeLocations).values({
    name: data.name,
    address: data.address || null,
    latitude: String(data.latitude),
    longitude: String(data.longitude),
    radiusMeters: data.radiusMeters,
    maxAccuracyMeters: data.maxAccuracyMeters,
  });

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'LOCATION_CREATED', targetEntity: 'office_location',
    newValue: data, ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Location created successfully.' }, 201);
}));

router.patch('/:id', validate(locationSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [existing] = await db.select().from(officeLocations).where(eq(officeLocations.id, id)).limit(1);
  if (!existing) return errorResponse(res, 404, 'NOT_FOUND', 'Location not found.');

  const data = req.body;
  await db.update(officeLocations).set({
    name: data.name,
    address: data.address || null,
    latitude: String(data.latitude),
    longitude: String(data.longitude),
    radiusMeters: data.radiusMeters,
    maxAccuracyMeters: data.maxAccuracyMeters,
  }).where(eq(officeLocations.id, id));

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'LOCATION_UPDATED', targetEntity: 'office_location', targetId: id,
    oldValue: { name: existing.name }, newValue: data,
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Location updated successfully.' });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [empCount] = await db.select({ total: count() }).from(users).where(eq(users.locationId, id));
  if (empCount.total > 0) {
    return errorResponse(res, 400, 'LOCATION_IN_USE', `Cannot delete location. ${empCount.total} employees are assigned to it.`);
  }
  await db.update(officeLocations).set({ isActive: false }).where(eq(officeLocations.id, id));
  successResponse(res, { message: 'Location deactivated.' });
}));

export default router;
