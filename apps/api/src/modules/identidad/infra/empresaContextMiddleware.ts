import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/http/AppError.js";
import type { UsuarioEmpresaRepository } from "./UsuarioEmpresaRepository.js";

const EMPRESA_HEADER = "x-empresa-id";

/**
 * Paso 2 de nota 06 seccion 3 — se monta SOLO en rutas de modulos de negocio
 * (contabilidad, compras, ventas, fiscal, tesoreria, stock, sueldos), nunca en
 * /auth, /tenants, /me, /usuarios: esas no dependen de una empresa activa.
 *
 * Doble validacion, nunca una sola:
 *   1. ¿Existe (usuarioId, empresaId) en usuario_empresa?
 *   2. ¿empresa.tenant_id coincide con el tenantId del JWT?
 * Cualquiera de las dos que falle -> 403 explicito (nunca 404 silencioso que
 * revele si la empresa existe o no, para no filtrar datos de otro tenant).
 */
export function createEmpresaContextMiddleware(usuarioEmpresaRepository: UsuarioEmpresaRepository) {
  return async function empresaContextMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (!req.auth) {
      throw AppError.unauthorized("empresaContextMiddleware requiere authMiddleware antes en la cadena");
    }

    const empresaId = req.header(EMPRESA_HEADER);
    if (!empresaId) {
      throw AppError.badRequest(`Falta el header ${EMPRESA_HEADER}`, "MISSING_EMPRESA_HEADER");
    }

    const acceso = await usuarioEmpresaRepository.buscarAcceso(req.auth.usuarioId, empresaId);
    if (!acceso) {
      throw AppError.forbidden("El usuario no tiene acceso a esta empresa");
    }
    if (acceso.empresaTenantId !== req.auth.tenantId) {
      throw AppError.forbidden("La empresa no pertenece al tenant del usuario");
    }

    req.context = {
      ...req.auth,
      empresaId: acceso.empresaId,
      rol: acceso.rol,
    };
    next();
  };
}
