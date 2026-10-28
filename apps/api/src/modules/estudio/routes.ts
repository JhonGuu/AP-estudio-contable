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
import { CrearVencimiento } from "./use-cases/CrearVencimiento.js";
import { ListarVencimientos } from "./use-cases/ListarVencimientos.js";
import { MarcarEstadoVencimiento } from "./use-cases/MarcarEstadoVencimiento.js";
import { EliminarVencimiento } from "./use-cases/EliminarVencimiento.js";
import { ObtenerPanelMonotributo } from "./use-cases/ObtenerPanelMonotributo.js";
import { ActualizarCategoriaMonotributo } from "./use-cases/ActualizarCategoriaMonotributo.js";
import { ESTADOS_TAREA } from "./domain/TareaEstudio.js";
import { ESTADOS_VENCIMIENTO, TIPOS_VENCIMIENTO } from "./domain/VencimientoFiscal.js";

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

const crearVencimientoSchema = z.object({
  empresaId: z.string().uuid(),
  tipo: z.enum(TIPOS_VENCIMIENTO),
  descripcion: z.string().max(200).nullable().optional(),
  periodo: z.string().max(20).nullable().optional(),
  fechaVencimiento: z.coerce.date(),
  asignadoAUsuarioId: z.string().uuid().nullable().optional(),
});

const marcarEstadoVencimientoSchema = z.object({
  estado: z.enum(ESTADOS_VENCIMIENTO),
});

const actualizarCategoriaMonotributoSchema = z.object({
  categoriaMonotributoId: z.string().uuid().nullable(),
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

  // --- calendario de vencimientos multi-cliente (ver domain/VencimientoFiscal.ts) ---

  router.post(
    "/vencimientos",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const input = crearVencimientoSchema.parse(req.body);
      const vencimiento = await container.get(CrearVencimiento).ejecutar(req.auth, input);
      res.status(201).json(vencimiento);
    }),
  );

  router.get(
    "/vencimientos",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const filtros = {
        empresaId: req.query.empresaId ? z.string().uuid().parse(req.query.empresaId) : undefined,
        tipo: req.query.tipo ? z.enum(TIPOS_VENCIMIENTO).parse(req.query.tipo) : undefined,
        estado: req.query.estado ? z.enum(ESTADOS_VENCIMIENTO).parse(req.query.estado) : undefined,
        desde: req.query.desde ? z.coerce.date().parse(req.query.desde) : undefined,
        hasta: req.query.hasta ? z.coerce.date().parse(req.query.hasta) : undefined,
      };
      const vencimientos = await container.get(ListarVencimientos).ejecutar(req.auth.tenantId, filtros);
      res.status(200).json(vencimientos);
    }),
  );

  router.post(
    "/vencimientos/:id/estado",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const vencimientoId = z.string().uuid().parse(req.params.id);
      const { estado } = marcarEstadoVencimientoSchema.parse(req.body);
      const vencimiento = await container.get(MarcarEstadoVencimiento).ejecutar(req.auth, vencimientoId, estado);
      res.status(200).json(vencimiento);
    }),
  );

  router.delete(
    "/vencimientos/:id",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const vencimientoId = z.string().uuid().parse(req.params.id);
      await container.get(EliminarVencimiento).ejecutar(req.auth, vencimientoId);
      res.status(204).send();
    }),
  );

  // --- panel de monotributo (ver domain/PanelMonotributo.ts) ---

  router.get(
    "/monotributo",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const panel = await container.get(ObtenerPanelMonotributo).ejecutar(req.auth.tenantId);
      res.status(200).json(panel);
    }),
  );

  router.post(
    "/monotributo/:empresaId/categoria",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const empresaId = z.string().uuid().parse(req.params.empresaId);
      const { categoriaMonotributoId } = actualizarCategoriaMonotributoSchema.parse(req.body);
      const empresa = await container
        .get(ActualizarCategoriaMonotributo)
        .ejecutar(req.auth, empresaId, categoriaMonotributoId);
      res.status(200).json(empresa);
    }),
  );

  return router;
}
