import { type Request, type Response, type NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function successResponse(res: Response, data: unknown = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function errorResponse(res: Response, statusCode: number, code: string, message: string) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
