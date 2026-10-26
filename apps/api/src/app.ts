import "reflect-metadata";
import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import type { Container } from "inversify";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";
import { createErrorHandler } from "./shared/http/errorHandler.js";
import { buildCatalogosRouter } from "./modules/catalogos/routes.js";
import { buildIdentidadRouter } from "./modules/identidad/routes.js";
import { buildComprobantesRouter } from "./modules/comprobantes/routes.js";
import { buildComprasRouter } from "./modules/compras/routes.js";
import { buildVentasRouter } from "./modules/ventas/routes.js";
import { buildTesoreriaRouter } from "./modules/tesoreria/routes.js";
import { buildContabilidadRouter } from "./modules/contabilidad/routes.js";

/**
 * Ensambla la app de Express a partir de un container ya construido (ver
 * container.ts). Separado de server.ts para poder testear rutas end-to-end
 * con supertest sin levantar un puerto real.
 */
export function buildApp(container: Container): Express {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Cada modulo nuevo (contabilidad, compras, ventas, fiscal, tesoreria,
  // stock, sueldos) monta aca su propio router, con empresaContextMiddleware
  // en las rutas que lo necesiten (identidad no lo necesita — nota 06).
  app.use(buildCatalogosRouter(container));
  app.use(buildIdentidadRouter(container));
  app.use(buildComprobantesRouter(container));
  app.use("/compras", buildComprasRouter(container));
  app.use("/ventas", buildVentasRouter(container));
  app.use("/tesoreria", buildTesoreriaRouter(container));
  app.use("/contabilidad", buildContabilidadRouter(container));

  app.use((req, res) => {
    res.status(404).json({ error: { message: "Ruta no encontrada", code: "NOT_FOUND" } });
  });

  app.use(createErrorHandler(logger));

  return app;
}
