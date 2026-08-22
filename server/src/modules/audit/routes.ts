import { Router, type Request, type Response } from 'express';
import { desc, count, eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { auditLogs, users } from '../../db/schema.js';
import { asyncHandler, successResponse } from '../../utils/response.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
  const offset = (page - 1) * limit;
  const action = req.query.action as string;
  const entity = req.query.entity as string;

  const conditions = [];
  if (action) conditions.push(eq(auditLogs.action, action));
  if (entity) conditions.push(eq(auditLogs.targetEntity, entity));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ total: count() }).from(auditLogs).where(whereClause);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  successResponse(res, {
    logs,
    pagination: { page, limit, total: totalResult.total, totalPages: Math.ceil(totalResult.total / limit) },
  });
}));

export default router;
