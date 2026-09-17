import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Envuelve un handler async para que un reject de la promesa llegue a
 * errorHandler en vez de quedar como una unhandled rejection (Express 4 no
 * hace esto solo).
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
