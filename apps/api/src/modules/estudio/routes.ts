import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { CrearTarea } from "./use-cases/CrearTarea.js";
import { ListarTareas } from "./use-cases/ListarTareas.js";
import { CambiarEstadoTarea } from "./use-cases/CambiarEstadoTarea.js";
import { AgregarItemChecklist } from "./use-cases/AgregarItemChecklist.js";
import { MarcarItemChecklist } from "./use-cases/MarcarItemChecklist.js";
import { ESTADOS_TAREA } from "./domain/TareaEstudio.js";

const crearTareaSchema = z.object({
  empresaId: z.string().uuid().nullable().optional(),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  asignadoAUsuarioId: z.string().uuid(),
  fechaLimite: z.coerce.date().nullable().optional(),
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(ESTADOS_TAREA),
});

const agregarItemSchema = z.object({
  descripcion: z.string().min(1).max(200),
});

const marcarItemSchema = z.object({
  completado: z.boolean(),
});

/**
 * Rutas del modulo "estudio" (gestion del estudio — gap nuevo, ver
 * domain/TareaEstudio.ts). Ninguna monta empresaContextMiddleware: opera a
 * nivel tenant, igual que /me, /empresas, /usuarios en identidad.
 */
export function buildEstudioRouter(container: Container): Router {
  const router = Router();

  router.post(
    "/tareas",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const input = crearTareaSchema.parse(req.body);
      const tarea = await container.get(CrearTarea).ejecutar(req.auth, input);
      res.status(201).json(tarea);
    }),
  );

  router.get(
    "/tareas",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const filtros = {
        empresaId: req.query.empresaId ? z.string().uuid().parse(req.query.empresaId) : undefined,
        asignadoAUsuarioId: req.query.asignadoAUsuarioId
          ? z.string().uuid().parse(req.query.asignadoAUsuarioId)
          : undefined,
        estado: req.query.estado ? z.enum(ESTADOS_TAREA).parse(req.query.estado) : undefined,
      };
      const tareas = await container.get(ListarTareas).ejecutar(req.auth.tenantId, filtros);
      res.status(200).json(tareas);
    }),
  );

  router.post(
    "/tareas/:id/estado",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const tareaId = z.string().uuid().parse(req.params.id);
      const { estado } = cambiarEstadoSchema.parse(req.body);
      const tarea = await container.get(CambiarEstadoTarea).ejecutar(req.auth, tareaId, estado);
      res.status(200).json(tarea);
    }),
  );

  router.post(
    "/tareas/:id/items",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const tareaId = z.string().uuid().parse(req.params.id);
      const { descripcion } = agregarItemSchema.parse(req.body);
      const item = await container.get(AgregarItemChecklist).ejecutar(req.auth, tareaId, descripcion);
      res.status(201).json(item);
    }),
  );

  router.post(
    "/tareas/items/:itemId",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const itemId = z.string().uuid().parse(req.params.itemId);
      const { completado } = marcarItemSchema.parse(req.body);
      const item = await container.get(MarcarItemChecklist).ejecutar(req.auth, itemId, completado);
      res.status(200).json(item);
    }),
  );

  return router;
}
