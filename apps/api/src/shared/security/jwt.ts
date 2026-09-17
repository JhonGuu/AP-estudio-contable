import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { RolGlobal } from "../../modules/identidad/domain/roles.js";

/**
 * Payload del access token — nota 06, seccion 3, punto 1: "{ sub: usuarioId,
 * tenantId, rolGlobal }". Deliberadamente NUNCA lleva empresaId: la empresa
 * activa viaja aparte, en el header X-Empresa-Id, para poder cambiarla sin
 * re-loguearse.
 */
export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  rolGlobal: RolGlobal;
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
