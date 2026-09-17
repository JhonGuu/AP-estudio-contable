import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { ListarTiposComprobante } from "./use-cases/ListarTiposComprobante.js";
import { CrearPuntoVenta } from "./use-cases/CrearPuntoVenta.js";
import { ListarPuntosVenta } from "./use-cases/ListarPuntosVenta.js";
import { APLICA_A_VALUES } from "./domain/TipoComprobante.js";

const crearPuntoVentaSchema = z.object({
  numero: z.number().int().positive(),
  nombre: z.string().min(1).max(100),
});

/**
 * Rutas compartidas por compras y ventas (nota 08, seccion 5): catalogo
 * global de tipos de comprobante (solo el JWT, no depende de una empresa
 * activa) y ABM de puntos de venta (si depende — nota 08 seccion 2 dice que
 * la numeracion AFIP es por punto de venta de la empresa).
 */
export function buildComprobantesRouter(container: Container): Router {
  const router = Router();
  const empresaContextMiddleware = createEmpresaContextMiddleware(container.get(UsuarioEmpresaRepository));

  router.get(
    "/tipos-comprobante",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const aplicaA = req.query.aplicaA
        ? z.enum(APLICA_A_VALUES).parse(req.query.aplicaA)
        : undefined;
      const tipos = await container.get(ListarTiposComprobante).ejecutar(aplicaA);
      res.status(200).json(tipos);
    }),
  );

  router.post(
    "/puntos-venta",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = crearPuntoVentaSchema.parse(req.body);
      const puntoVenta = await container.get(CrearPuntoVenta).ejecutar(req.context, input);
      res.status(201).json(puntoVenta);
    }),
  );

  router.get(
    "/puntos-venta",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const puntos = await container.get(ListarPuntosVenta).ejecutar(req.context.empresaId);
      res.status(200).json(puntos);
    }),
  );

  return router;
}
