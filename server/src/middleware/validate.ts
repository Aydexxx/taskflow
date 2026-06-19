import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import type { ApiError } from '@taskflow/shared';

/** Validates `req.body` against a zod schema, replacing it with the parsed data on success. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      const body: ApiError = { error: { message, code: 'VALIDATION_ERROR' } };
      res.status(400).json(body);
      return;
    }
    req.body = result.data;
    next();
  };
}
