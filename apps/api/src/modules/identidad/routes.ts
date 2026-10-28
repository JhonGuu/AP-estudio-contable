import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "./infra/authMiddleware.js";
import { CrearTenant } from "./use-cases/CrearTenant.js";
import { Login } from "./use-cases/Login.js";
import { RefrescarToken } from "./use-cases/RefrescarToken.js";
import { ObtenerPerfil } from "./use-cases/ObtenerPerfil.js";
import { CrearEmpresa } from "./use-cases/CrearEmpresa.js";
import { ListarEmpresas } from "./use-cases/ListarEmpresas.js";
import { InvitarUsuario } from "./use-cases/InvitarUsuario.js";
import { AsignarUsuarioEmpresa } from "./use-cases/AsignarUsuarioEmpresa.js";
import { ListarUsuarios } from "./use-cases/ListarUsuarios.js";
import { ROLES_GLOBALES, ROLES_EMPRESA } from "./domain/roles.js";

const crearTenantSchema = z.object({
  razonSocial: z.string().min(2).max(150),
  cuit: z.string().regex(/^\d{11}$/, "CUIT debe tener 11 digitos sin guiones"),
  emailContacto: z.string().email(),
  ownerNombre: z.string().min(1).max(100),
  ownerApellido: z.string().min(1).max(100),
  ownerPassword: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const crearEmpresaSchema = z.object({
  razonSocial: z.string().min(2).max(150),
  nombreComercial: z.string().max(150).nullable().optional(),
  cuit: z.string().regex(/^\d{11}$/),
  condicionIvaId: z.string().uuid(),
  domicilioFiscal: z.string().min(1).max(200),
  provinciaId: z.string().uuid(),
  actividadAfip: z.string().min(1).max(10),
  monedaBaseId: z.string().uuid(),
  cierreEjercicio: z.string().regex(/^\d{2}-\d{2}$/, "Formato MM-DD"),
});

const invitarUsuarioSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  rolGlobal: z.enum(ROLES_GLOBALES),
});

const asignarEmpresaSchema = z.object({
  empresaId: z.string().uuid(),
  rol: z.enum(ROLES_EMPRESA),
});

/**
 * Rutas del nucleo (nota 06, seccion 4). Ninguna de estas monta
 * empresaContextMiddleware: son endpoints de identidad/gestion, no de un
 * modulo de negocio, asi que solo necesitan el JWT (cuando corresponde).
 */
export function buildIdentidadRouter(container: Container): Router {
  const router = Router();

  router.post(
    "/tenants",
    asyncHandler(async (req, res) => {
      const input = crearTenantSchema.parse(req.body);
      const result = await container.get(CrearTenant).ejecutar(input);
      res.status(201).json(result);
    }),
  );

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const input = loginSchema.parse(req.body);
      const result = await container.get(Login).ejecutar(input);
      res.status(200).json(result);
    }),
  );

  router.post(
    "/auth/refresh",
    asyncHandler(async (req, res) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await container.get(RefrescarToken).ejecutar(refreshToken);
      res.status(200).json(result);
    }),
  );

  router.get(
    "/me",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const result = await container.get(ObtenerPerfil).ejecutar(req.auth.usuarioId);
      res.status(200).json(result);
    }),
  );

  router.post(
    "/empresas",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const input = crearEmpresaSchema.parse(req.body);
      const empresa = await container.get(CrearEmpresa).ejecutar(req.auth, input);
      res.status(201).json(empresa);
    }),
  );

  router.get(
    "/empresas",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const empresas = await container.get(ListarEmpresas).ejecutar(req.auth.tenantId);
      res.status(200).json(empresas);
    }),
  );

  router.post(
    "/usuarios",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const input = invitarUsuarioSchema.parse(req.body);
      const result = await container.get(InvitarUsuario).ejecutar(req.auth, input);
      res.status(201).json(result);
    }),
  );

  router.get(
    "/usuarios",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const usuarios = await container.get(ListarUsuarios).ejecutar(req.auth.tenantId);
      res.status(200).json(usuarios);
    }),
  );

  router.post(
    "/usuarios/:id/empresas",
    authMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.auth) throw AppError.unauthorized();
      const { empresaId, rol } = asignarEmpresaSchema.parse(req.body);
      const usuarioId = z.string().uuid().parse(req.params.id);
      await container.get(AsignarUsuarioEmpresa).ejecutar(req.auth, usuarioId, empresaId, rol);
      res.status(204).send();
    }),
  );

  return router;
}
