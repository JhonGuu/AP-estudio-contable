import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { ListarPlanCuentas } from "./use-cases/ListarPlanCuentas.js";
import { ListarAsientos } from "./use-cases/ListarAsientos.js";
import { ObtenerLibroMayor } from "./use-cases/ObtenerLibroMayor.js";
import { TIPOS_CUENTA } from "./domain/CuentaContable.js";

const listarPlanCuentasQuerySchema = z.object({
  tipo: z.enum(TIPOS_CUENTA).optional(),
  imputable: z.coerce.boolean().optional(),
});

const filtrosAsientoQuerySchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

const libroMayorQuerySchema = filtrosAsientoQuerySchema.extend({
  cuentaId: z.string().uuid(),
});

/**
 * Rutas del modulo contabilidad: plan de cuentas de solo-lectura (nota 07,
 * seccion 2) y reportes contables (Libro Diario / Libro Mayor, nota 11
 * cnt_asiento/cnt_movimiento) — asientos se siguen generando via
 * GenerarAsientoDesdeComprobante desde otros modulos, estas rutas son de
 * solo consulta.
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

  router.get(
    "/asientos",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const filtros = filtrosAsientoQuerySchema.parse(req.query);
      const asientos = await container.get(ListarAsientos).ejecutar(req.context.empresaId, filtros);
      res.status(200).json(asientos);
    }),
  );

  router.get(
    "/libro-mayor",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const { cuentaId, ...filtros } = libroMayorQuerySchema.parse(req.query);
      const resultado = await container.get(ObtenerLibroMayor).ejecutar(req.context.empresaId, cuentaId, filtros);
      res.status(200).json(resultado);
    }),
  );

  return router;
}
