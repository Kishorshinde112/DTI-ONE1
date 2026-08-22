import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export async function createAuditLog(params: {
  actorId?: number;
  actorEmail?: string;
  action: string;
  targetEntity: string;
  targetId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(auditLogs).values({
    actorId: params.actorId ?? null,
    actorEmail: params.actorEmail ?? null,
    action: params.action,
    targetEntity: params.targetEntity,
    targetId: params.targetId ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    reason: params.reason ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || 'unknown';
}
