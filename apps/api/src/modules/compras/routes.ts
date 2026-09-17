import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { RegistrarProveedor } from "./use-cases/RegistrarProveedor.js";
import { ListarProveedores } from "./use-cases/ListarProveedores.js";
import { RegistrarComprobanteCompra } from "./use-cases/RegistrarComprobanteCompra.js";
import { ConfirmarComprobanteCompra } from "./use-cases/ConfirmarComprobanteCompra.js";
import { ListarComprobantesCompra } from "./use-cases/ListarComprobantesCompra.js";
import { RegistrarPagoCompra } from "./use-cases/RegistrarPagoCompra.js";
import { ESTADOS_COMPROBANTE_COMPRA, TIPOS_IMPUESTO_COMPROBANTE } from "./domain/ComprobanteCompra.js";
import { MEDIOS_PAGO, TIPOS_RETENCION } from "./domain/Pago.js";

const registrarProveedorSchema = z.object({
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
  tipo: z.enum(TIPOS_IMPUESTO_COMPROBANTE),
  importe: z.number().nonnegative(),
});

const registrarComprobanteCompraSchema = z.object({
  proveedorId: z.string().uuid(),
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
});

const medioSchema = z.object({
  medio: z.enum(MEDIOS_PAGO),
  importe: z.number().positive(),
});

const comprobanteAplicadoSchema = z.object({
  comprobanteId: z.string().uuid(),
  importeAplicado: z.number().positive(),
});

const retencionSchema = z.object({
  tipo: z.enum(TIPOS_RETENCION),
  importe: z.number().positive(),
});

const registrarPagoCompraSchema = z.object({
  proveedorId: z.string().uuid(),
  fecha: z.coerce.date(),
  importeTotal: z.number().positive(),
  medios: z.array(medioSchema).min(1),
  comprobantes: z.array(comprobanteAplicadoSchema).min(1),
  retenciones: z.array(retencionSchema).optional(),
});

const listarComprobantesQuerySchema = z.object({
  estado: z.enum(ESTADOS_COMPROBANTE_COMPRA).optional(),
  proveedorId: z.string().uuid().optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

/**
 * Rutas del modulo compras (nota 08, seccion 5). Todas requieren empresa
 * activa (X-Empresa-Id) salvo el catalogo compartido de tipos-comprobante,
 * que vive en el modulo comprobantes.
 */
export function buildComprasRouter(container: Container): Router {
  const router = Router();
  const empresaContextMiddleware = createEmpresaContextMiddleware(container.get(UsuarioEmpresaRepository));

  router.post(
    "/proveedores",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarProveedorSchema.parse(req.body);
      const proveedor = await container.get(RegistrarProveedor).ejecutar(req.context, input);
      res.status(201).json(proveedor);
    }),
  );

  router.get(
    "/proveedores",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const proveedores = await container.get(ListarProveedores).ejecutar(req.context.empresaId);
      res.status(200).json(proveedores);
    }),
  );

  router.post(
    "/comprobantes",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarComprobanteCompraSchema.parse(req.body);
      const comprobante = await container.get(RegistrarComprobanteCompra).ejecutar(req.context, input);
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
      const comprobantes = await container.get(ListarComprobantesCompra).ejecutar(req.context.empresaId, filtros);
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
      const comprobante = await container.get(ConfirmarComprobanteCompra).ejecutar(req.context, comprobanteId);
      res.status(200).json(comprobante);
    }),
  );

  router.post(
    "/pagos",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarPagoCompraSchema.parse(req.body);
      const pago = await container.get(RegistrarPagoCompra).ejecutar(req.context, input);
      res.status(201).json(pago);
    }),
  );

  return router;
}
