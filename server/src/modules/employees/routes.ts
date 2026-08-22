import { Router, type Request, type Response } from 'express';
import * as argon2 from 'argon2';
import { eq, and, or, like, sql, desc, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, shifts, officeLocations } from '../../db/schema.js';
import { config } from '../../config/index.js';
import { asyncHandler, successResponse, errorResponse } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { employeeCreateSchema, employeeUpdateSchema, paginationSchema } from '../../validators/index.js';
import { createAuditLog, getClientIp } from '../../services/audit.js';

const router = Router();
router.use(authenticate, requireAdmin);

// ── List Employees ──
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
  const offset = (page - 1) * limit;
  const search = req.query.search as string;
  const status = req.query.status as string;
  const role = req.query.role as string;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.username, `%${search}%`),
        like(users.employeeId, `%${search}%`),
        like(users.phone, `%${search}%`),
      )
    );
  }
  if (status) conditions.push(eq(users.employmentStatus, status as any));
  if (role) conditions.push(eq(users.role, role as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(users)
    .where(whereClause);

  const employeeList = await db
    .select({
      id: users.id, email: users.email, username: users.username,
      firstName: users.firstName, lastName: users.lastName,
      phone: users.phone, employeeId: users.employeeId,
      role: users.role, department: users.department, designation: users.designation,
      profilePhoto: users.profilePhoto, joiningDate: users.joiningDate,
      employmentStatus: users.employmentStatus, accountStatus: users.accountStatus,
      shiftId: users.shiftId, locationId: users.locationId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with shift and location names
  const shiftIds = [...new Set(employeeList.filter(e => e.shiftId).map(e => e.shiftId!))];
  const locationIds = [...new Set(employeeList.filter(e => e.locationId).map(e => e.locationId!))];

  const shiftsMap = new Map<number, string>();
  const locationsMap = new Map<number, string>();

  if (shiftIds.length > 0) {
    const shiftList = await db.select({ id: shifts.id, name: shifts.name }).from(shifts);
    for (const s of shiftList) shiftsMap.set(s.id, s.name);
  }

  if (locationIds.length > 0) {
    const locationList = await db.select({ id: officeLocations.id, name: officeLocations.name }).from(officeLocations);
    for (const l of locationList) locationsMap.set(l.id, l.name);
  }

  const enriched = employeeList.map(e => ({
    ...e,
    shiftName: e.shiftId ? shiftsMap.get(e.shiftId) || null : null,
    locationName: e.locationId ? locationsMap.get(e.locationId) || null : null,
  }));

  successResponse(res, {
    employees: enriched,
    pagination: { page, limit, total: totalResult.total, totalPages: Math.ceil(totalResult.total / limit) },
  });
}));

// ── Get Single Employee ──
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const [employee] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!employee) return errorResponse(res, 404, 'NOT_FOUND', 'Employee not found.');

  const { passwordHash, ...safe } = employee;
  successResponse(res, { employee: safe });
}));

// ── Create Employee ──
router.post('/', validate(employeeCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;

  const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existingEmail) return errorResponse(res, 409, 'EMAIL_EXISTS', 'An account with this email already exists.');

  const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1);
  if (existingUsername) return errorResponse(res, 409, 'USERNAME_EXISTS', 'This username is already taken.');

  let passwordHash: string | null = null;
  if (data.password) {
    passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
  }

  const [maxIdRow] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(users);
  const nextNum = (maxIdRow?.maxId || 0) + 1;
  const employeeId = `${config.employeeIdPrefix}-${String(nextNum).padStart(4, '0')}`;

  await db.insert(users).values({
    email: data.email,
    username: data.username,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    employeeId,
    role: data.role,
    department: data.department || null,
    designation: data.designation || null,
    shiftId: data.shiftId || null,
    locationId: data.locationId || null,
    joiningDate: data.joiningDate || null,
    accountStatus: 'active',
    emailVerified: true,
    employmentStatus: 'active',
  });

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'EMPLOYEE_CREATED', targetEntity: 'user',
    newValue: { email: data.email, employeeId, role: data.role },
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Employee created successfully.', employeeId }, 201);
}));

// ── Update Employee ──
router.patch('/:id', validate(employeeUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const data = req.body;

  const [employee] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!employee) return errorResponse(res, 404, 'NOT_FOUND', 'Employee not found.');

  if (data.email && data.email !== employee.email) {
    const [existingEmail] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, data.email), sql`${users.id} != ${id}`)).limit(1);
    if (existingEmail) return errorResponse(res, 409, 'EMAIL_EXISTS', 'This email is already in use.');
  }

  if (data.username && data.username !== employee.username) {
    const [existingUsername] = await db.select({ id: users.id }).from(users).where(and(eq(users.username, data.username), sql`${users.id} != ${id}`)).limit(1);
    if (existingUsername) return errorResponse(res, 409, 'USERNAME_EXISTS', 'This username is already taken.');
  }

  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const updateData: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && (employee as Record<string, unknown>)[key] !== val) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      oldValue[key] = (employee as Record<string, unknown>)[key];
      newValue[key] = val;
      updateData[key] = val;
    }
  }

  if (Object.keys(updateData).length === 0) return successResponse(res, { message: 'No changes detected.' });

  await db.update(users).set(updateData as any).where(eq(users.id, id));

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'EMPLOYEE_UPDATED', targetEntity: 'user', targetId: id,
    oldValue, newValue, ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Employee updated successfully.' });
}));

// ── Reset Employee Password ──
router.post('/:id/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { newPassword } = req.body;

  if (!newPassword) return errorResponse(res, 400, 'VALIDATION_ERROR', 'New password is required.');

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/;
  if (!passwordRegex.test(newPassword) || /\s/.test(newPassword)) {
    return errorResponse(res, 400, 'INVALID_PASSWORD', 'Password does not meet requirements.');
  }

  const [employee] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!employee) return errorResponse(res, 404, 'NOT_FOUND', 'Employee not found.');

  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, id));

  await createAuditLog({
    actorId: req.user!.id, actorEmail: req.user!.email,
    action: 'PASSWORD_RESET_BY_ADMIN', targetEntity: 'user', targetId: id,
    reason: 'Admin password reset',
    ipAddress: getClientIp(req),
  });

  successResponse(res, { message: 'Password reset successfully.' });
}));

export default router;
