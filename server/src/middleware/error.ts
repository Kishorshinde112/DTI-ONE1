import { type Request, type Response, type NextFunction } from 'express';
import { config } from '../config/index.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (!config.isProduction) {
    console.error(err.stack);
  }

  const statusCode = (err as any).statusCode || 500;
  const code = (err as any).code || 'INTERNAL_ERROR';
  const message = config.isProduction && statusCode === 500
    ? 'An unexpected error occurred.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
