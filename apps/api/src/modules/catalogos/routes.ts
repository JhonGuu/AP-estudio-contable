import { Router } from "express";
import type { Container } from "inversify";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { ObtenerCatalogos } from "./use-cases/ObtenerCatalogos.js";

/**
 * GET /catalogos (nota 01, nota 25 seccion 3): catalogos globales de solo
 * lectura, sin empresaContextMiddleware — no dependen de una empresa activa,
 * solo de estar logueado.
 */
export function buildCatalogosRouter(container: Container): Router {
  const router = Router();

  router.get(
    "/catalogos",
    authMiddleware,
    asyncHandler(async (_req, res) => {
      const catalogos = await container.get(ObtenerCatalogos).ejecutar();
      res.status(200).json(catalogos);
    }),
  );

  return router;
}
