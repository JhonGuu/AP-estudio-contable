import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/http/AppError.js";
import { verifyAccessToken } from "../../../shared/security/jwt.js";

/**
 * Paso 1 de nota 06 seccion 3: valida el JWT y extrae usuarioId + tenantId +
 * rolGlobal a req.auth. No sabe nada de empresas — eso es empresaContextMiddleware.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Falta el header Authorization: Bearer <token>");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      usuarioId: payload.sub,
      tenantId: payload.tenantId,
      rolGlobal: payload.rolGlobal,
    };
    next();
  } catch {
    throw AppError.unauthorized("Token invalido o expirado");
  }
}
