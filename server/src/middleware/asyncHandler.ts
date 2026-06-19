import type { NextFunction, Request, Response } from 'express';

type AsyncRequestHandler<Req extends Request = Request, Res extends Response = Response> = (
  req: Req,
  res: Res,
  next: NextFunction,
) => Promise<void>;

/** Wraps an async Express handler so a rejected promise is forwarded to the error middleware. */
export function asyncHandler<Req extends Request, Res extends Response>(
  handler: AsyncRequestHandler<Req, Res>,
): (req: Req, res: Res, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
