import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { ListarPlanCuentas } from "./use-cases/ListarPlanCuentas.js";
import { TIPOS_CUENTA } from "./domain/CuentaContable.js";

const listarPlanCuentasQuerySchema = z.object({
  tipo: z.enum(TIPOS_CUENTA).optional(),
  imputable: z.coerce.boolean().optional(),
});

/**
 * Rutas del modulo contabilidad. Hoy solo expone el plan de cuentas de
 * solo-lectura (nota 07, seccion 2) — asientos se generan via
 * GenerarAsientoDesdeComprobante desde otros modulos, sin ruta HTTP propia
 * todavia (ver pendiente "GET /asientos" en el doc de estado del proyecto).
 */
export function buildContabilidadRouter(container: Container): Router {
  const router = Router();
  const empresaContextMiddleware = createEmpresaContextMiddleware(container.get(UsuarioEmpresaRepository));

  router.get(
    "/plan-cuentas",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const filtros = listarPlanCuentasQuerySchema.parse(req.query);
      let cuentas = await container.get(ListarPlanCuentas).ejecutar(req.context.empresaId);
      if (filtros.tipo) cuentas = cuentas.filter((c) => c.tipo === filtros.tipo);
      if (filtros.imputable !== undefined) cuentas = cuentas.filter((c) => c.imputable === filtros.imputable);
      res.status(200).json(cuentas);
    }),
  );

  return router;
}
