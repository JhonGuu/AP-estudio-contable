import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { Logger } from "pino";
import { AppError } from "./AppError.js";

/**
 * Middleware de error unico, montado al final de app.ts. Nunca deja escapar
 * un stack trace ni el mensaje crudo de un error inesperado al cliente.
 */
export function createErrorHandler(logger: Logger) {
  return function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ): void {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error({ err: error, path: req.path }, error.message);
      }
      res.status(error.statusCode).json({
        error: { message: error.message, code: error.code },
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          message: "Datos invalidos",
          code: "VALIDATION_ERROR",
          details: error.flatten(),
        },
      });
      return;
    }

    logger.error({ err: error, path: req.path }, "Error no controlado");
    res.status(500).json({ error: { message: "Error interno", code: "INTERNAL_ERROR" } });
  };
}
