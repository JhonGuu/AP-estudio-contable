import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { RegistrarCliente } from "./use-cases/RegistrarCliente.js";
import { ListarClientes } from "./use-cases/ListarClientes.js";
import { RegistrarComprobanteVenta } from "./use-cases/RegistrarComprobanteVenta.js";
import { ConfirmarComprobanteVenta } from "./use-cases/ConfirmarComprobanteVenta.js";
import { ListarComprobantesVenta } from "./use-cases/ListarComprobantesVenta.js";
import { RegistrarCobroVenta } from "./use-cases/RegistrarCobroVenta.js";
import { ESTADOS_COMPROBANTE_VENTA, TIPOS_IMPUESTO_COMPROBANTE_VENTA } from "./domain/ComprobanteVenta.js";
import { MEDIOS_COBRO } from "./domain/Cobro.js";

const registrarClienteSchema = z.object({
  razonSocial: z.string().min(2).max(150),
  cuit: z.string().regex(/^\d{11}$/, "CUIT debe tener 11 digitos sin guiones"),
  condicionIvaId: z.string().uuid(),
  domicilio: z.string().max(200).nullable().optional(),
});

const itemSchema = z.object({
  descripcion: z.string().min(1).max(200),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  alicuotaIva: z.number().nonnegative(),
});

const impuestoSchema = z.object({
  tipo: z.enum(TIPOS_IMPUESTO_COMPROBANTE_VENTA),
  importe: z.number().nonnegative(),
});

const cuotaSchema = z.object({
  numero: z.number().int().positive(),
  fecha: z.coerce.date(),
  importe: z.number().positive(),
  capital: z.number().nonnegative(),
  interes: z.number().nonnegative().default(0),
});

const registrarComprobanteVentaSchema = z.object({
  clienteId: z.string().uuid(),
  tipoComprobanteId: z.string().uuid(),
  puntoVentaId: z.string().uuid(),
  fecha: z.coerce.date(),
  rubro: z.number().int().positive().optional(),
  netoTotal: z.number().nonnegative(),
  exentoTotal: z.number().nonnegative().optional(),
  noGravadoTotal: z.number().nonnegative().optional(),
  importeTotal: z.number().positive(),
  items: z.array(itemSchema).default([]),
  impuestos: z.array(impuestoSchema).default([]),
  cuotas: z.array(cuotaSchema).default([]),
});

const medioSchema = z.object({
  medio: z.enum(MEDIOS_COBRO),
  importe: z.number().positive(),
});

const comprobanteAplicadoSchema = z.object({
  comprobanteId: z.string().uuid(),
  importeAplicado: z.number().positive(),
});

const registrarCobroVentaSchema = z.object({
  clienteId: z.string().uuid(),
  fecha: z.coerce.date(),
  importeTotal: z.number().positive(),
  medios: z.array(medioSchema).min(1),
  comprobantes: z.array(comprobanteAplicadoSchema).min(1),
});

const listarComprobantesQuerySchema = z.object({
  estado: z.enum(ESTADOS_COMPROBANTE_VENTA).optional(),
  clienteId: z.string().uuid().optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

/**
 * Rutas del modulo ventas (nota 08, seccion 5 — espejo de compras). Todas
 * requieren empresa activa (X-Empresa-Id).
 */
export function buildVentasRouter(container: Container): Router {
  const router = Router();
  const empresaContextMiddleware = createEmpresaContextMiddleware(container.get(UsuarioEmpresaRepository));

  router.post(
    "/clientes",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarClienteSchema.parse(req.body);
      const cliente = await container.get(RegistrarCliente).ejecutar(req.context, input);
      res.status(201).json(cliente);
    }),
  );

  router.get(
    "/clientes",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const clientes = await container.get(ListarClientes).ejecutar(req.context.empresaId);
      res.status(200).json(clientes);
    }),
  );

  router.post(
    "/comprobantes",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarComprobanteVentaSchema.parse(req.body);
      const comprobante = await container.get(RegistrarComprobanteVenta).ejecutar(req.context, input);
      res.status(201).json(comprobante);
    }),
  );

  router.get(
    "/comprobantes",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const filtros = listarComprobantesQuerySchema.parse(req.query);
      const comprobantes = await container.get(ListarComprobantesVenta).ejecutar(req.context.empresaId, filtros);
      res.status(200).json(comprobantes);
    }),
  );

  router.post(
    "/comprobantes/:id/confirmar",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const comprobanteId = z.string().uuid().parse(req.params.id);
      const comprobante = await container.get(ConfirmarComprobanteVenta).ejecutar(req.context, comprobanteId);
      res.status(200).json(comprobante);
    }),
  );

  router.post(
    "/cobros",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarCobroVentaSchema.parse(req.body);
      const cobro = await container.get(RegistrarCobroVenta).ejecutar(req.context, input);
      res.status(201).json(cobro);
    }),
  );

  return router;
}
