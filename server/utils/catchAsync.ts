import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async controller so you never have to write try/catch.
 * Any thrown error is forwarded to the global error middleware via next().
 *
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
