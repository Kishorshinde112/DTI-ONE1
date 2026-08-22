import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { config } from '../config/index.js';
import { errorResponse } from '../utils/response.js';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'staff';
  employeeId: string;
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required.');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: number; email: string; role: string };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        employeeId: users.employeeId,
        firstName: users.firstName,
        lastName: users.lastName,
        accountStatus: users.accountStatus,
        employmentStatus: users.employmentStatus,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!user || user.accountStatus !== 'active' || user.employmentStatus !== 'active') {
      return errorResponse(res, 401, 'ACCOUNT_DISABLED', 'Your account is not active.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch {
    return errorResponse(res, 401, 'INVALID_TOKEN', 'Invalid or expired token.');
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 403, 'FORBIDDEN', 'Admin access required.');
  }
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required.');
  }
  next();
}
