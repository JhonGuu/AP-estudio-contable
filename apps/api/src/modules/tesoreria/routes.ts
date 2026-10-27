import { Router } from "express";
import type { Container } from "inversify";
import { z } from "zod";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { AppError } from "../../shared/http/AppError.js";
import { authMiddleware } from "../identidad/infra/authMiddleware.js";
import { createEmpresaContextMiddleware } from "../identidad/infra/empresaContextMiddleware.js";
import { UsuarioEmpresaRepository } from "../identidad/infra/UsuarioEmpresaRepository.js";
import { RegistrarCaja } from "./use-cases/RegistrarCaja.js";
import { ListarCajas } from "./use-cases/ListarCajas.js";
import { RegistrarCuentaBancaria } from "./use-cases/RegistrarCuentaBancaria.js";
import { ListarCuentasBancarias } from "./use-cases/ListarCuentasBancarias.js";
import { RegistrarTarjeta } from "./use-cases/RegistrarTarjeta.js";
import { ListarTarjetas } from "./use-cases/ListarTarjetas.js";
import { RegistrarChequera } from "./use-cases/RegistrarChequera.js";
import { ListarChequeras } from "./use-cases/ListarChequeras.js";
import { RegistrarCheque } from "./use-cases/RegistrarCheque.js";
import { ListarCheques } from "./use-cases/ListarCheques.js";
import { DepositarCheque } from "./use-cases/DepositarCheque.js";
import { RechazarCheque } from "./use-cases/RechazarCheque.js";
import { RegistrarMovimientoFondo } from "./use-cases/RegistrarMovimientoFondo.js";
import { ListarMovimientosFondo } from "./use-cases/ListarMovimientosFondo.js";
import { AbrirCajaDiaria } from "./use-cases/AbrirCajaDiaria.js";
import { CerrarCajaDiaria } from "./use-cases/CerrarCajaDiaria.js";
import { ListarCajasDiarias } from "./use-cases/ListarCajasDiarias.js";
import { ImportarExtractoBancario } from "./use-cases/ImportarExtractoBancario.js";
import { ListarConciliacion } from "./use-cases/ListarConciliacion.js";
import { ConciliarLineaManual } from "./use-cases/ConciliarLineaManual.js";
import { ORIGENES_CHEQUE, TIPOS_TERCERO_CHEQUE } from "./domain/Cheque.js";
import { TIPOS_CUENTA_FONDO, TIPOS_MOVIMIENTO_FONDO } from "./domain/MovimientoFondo.js";

const registrarCajaSchema = z.object({
  nombre: z.string().min(1).max(100),
  monedaId: z.string().uuid(),
  cuentaContableId: z.string().uuid(),
});

const registrarCuentaBancariaSchema = z.object({
  nombre: z.string().min(1).max(100),
  cbu: z.string().max(22).nullable().optional(),
  banco: z.string().min(1).max(100),
  monedaId: z.string().uuid(),
  cuentaContableId: z.string().uuid(),
});

const registrarTarjetaSchema = z.object({
  nombre: z.string().min(1).max(100),
  cuentaLiquidadoraId: z.string().uuid(),
});

const registrarChequeraSchema = z.object({
  cuentaBancariaId: z.string().uuid(),
  numeroDesde: z.number().int().positive(),
  numeroHasta: z.number().int().positive(),
});

const registrarChequeSchema = z.object({
  origen: z.enum(ORIGENES_CHEQUE),
  chequeraId: z.string().uuid().optional(),
  numero: z.string().max(30).optional(),
  importe: z.number().positive(),
  fechaEmision: z.coerce.date(),
  fechaVencimiento: z.coerce.date(),
  bancoEmisor: z.string().max(100).nullable().optional(),
  terceroTipo: z.enum(TIPOS_TERCERO_CHEQUE),
  terceroId: z.string().uuid(),
});

const depositarChequeSchema = z.object({
  cuentaBancariaId: z.string().uuid(),
  fecha: z.coerce.date(),
});

const abrirCajaDiariaSchema = z.object({
  cajaId: z.string().uuid(),
  fecha: z.coerce.date(),
});

const cerrarCajaDiariaSchema = z.object({
  fecha: z.coerce.date(),
  totalContado: z.number().min(0),
});

const lineaExtractoSchema = z.object({
  fecha: z.coerce.date(),
  descripcion: z.string().min(1).max(300),
  importe: z.number(),
});

const importarExtractoBancarioSchema = z.object({
  lineas: z.array(lineaExtractoSchema).min(1),
});

const conciliarLineaManualSchema = z.object({
  asientoId: z.string().uuid(),
});

const registrarMovimientoFondoSchema = z.object({
  fecha: z.coerce.date(),
  tipo: z.enum(TIPOS_MOVIMIENTO_FONDO),
  cuentaOrigenTipo: z.enum(TIPOS_CUENTA_FONDO).nullable().optional(),
  cuentaOrigenId: z.string().uuid().nullable().optional(),
  cuentaDestinoTipo: z.enum(TIPOS_CUENTA_FONDO).nullable().optional(),
  cuentaDestinoId: z.string().uuid().nullable().optional(),
  importe: z.number().positive(),
  descripcion: z.string().min(1).max(200),
});

/** Rutas del modulo tesoreria (nota 22, seccion 6). Todas requieren empresa activa. */
export function buildTesoreriaRouter(container: Container): Router {
  const router = Router();
  const empresaContextMiddleware = createEmpresaContextMiddleware(container.get(UsuarioEmpresaRepository));

  router.post(
    "/cajas",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarCajaSchema.parse(req.body);
      const caja = await container.get(RegistrarCaja).ejecutar(req.context, input);
      res.status(201).json(caja);
    }),
  );

  router.get(
    "/cajas",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cajas = await container.get(ListarCajas).ejecutar(req.context.empresaId);
      res.status(200).json(cajas);
    }),
  );

  router.post(
    "/cuentas-bancarias",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarCuentaBancariaSchema.parse(req.body);
      const cuenta = await container.get(RegistrarCuentaBancaria).ejecutar(req.context, input);
      res.status(201).json(cuenta);
    }),
  );

  router.get(
    "/cuentas-bancarias",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cuentas = await container.get(ListarCuentasBancarias).ejecutar(req.context.empresaId);
      res.status(200).json(cuentas);
    }),
  );

  router.post(
    "/tarjetas",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarTarjetaSchema.parse(req.body);
      const tarjeta = await container.get(RegistrarTarjeta).ejecutar(req.context, input);
      res.status(201).json(tarjeta);
    }),
  );

  router.get(
    "/tarjetas",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const tarjetas = await container.get(ListarTarjetas).ejecutar(req.context.empresaId);
      res.status(200).json(tarjetas);
    }),
  );

  router.post(
    "/chequeras",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarChequeraSchema.parse(req.body);
      const chequera = await container.get(RegistrarChequera).ejecutar(req.context, input);
      res.status(201).json(chequera);
    }),
  );

  router.get(
    "/chequeras",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const chequeras = await container.get(ListarChequeras).ejecutar(req.context.empresaId);
      res.status(200).json(chequeras);
    }),
  );

  router.post(
    "/cheques",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = registrarChequeSchema.parse(req.body);
      const cheque = await container.get(RegistrarCheque).ejecutar(req.context, input);
      res.status(201).json(cheque);
    }),
  );

  router.get(
    "/cheques",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cheques = await container.get(ListarCheques).ejecutar(req.context.empresaId);
      res.status(200).json(cheques);
    }),
  );

  router.post(
    "/cheques/:id/depositar",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const chequeId = z.string().uuid().parse(req.params.id);
      const input = depositarChequeSchema.parse(req.body);
      const cheque = await container
        .get(DepositarCheque)
        .ejecutar(req.context, { chequeId, cuentaBancariaId: input.cuentaBancariaId, fecha: input.fecha });
      res.status(200).json(cheque);
    }),
  );

  router.post(
    "/cheques/:id/rechazar",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const chequeId = z.string().uuid().parse(req.params.id);
      const cheque = await container.get(RechazarCheque).ejecutar(req.context, chequeId);
      res.status(200).json(cheque);
    }),
  );

  router.post(
    "/movimientos-fondo",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const body = registrarMovimientoFondoSchema.parse(req.body);
      const input = {
        fecha: body.fecha,
        tipo: body.tipo,
        cuentaOrigenTipo: body.cuentaOrigenTipo ?? null,
        cuentaOrigenId: body.cuentaOrigenId ?? null,
        cuentaDestinoTipo: body.cuentaDestinoTipo ?? null,
        cuentaDestinoId: body.cuentaDestinoId ?? null,
        importe: body.importe,
        descripcion: body.descripcion,
      };
      const movimiento = await container.get(RegistrarMovimientoFondo).ejecutar(req.context, input);
      res.status(201).json(movimiento);
    }),
  );

  router.get(
    "/movimientos-fondo",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const movimientos = await container.get(ListarMovimientosFondo).ejecutar(req.context.empresaId);
      res.status(200).json(movimientos);
    }),
  );

  router.post(
    "/caja-diaria/abrir",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const input = abrirCajaDiariaSchema.parse(req.body);
      const turno = await container.get(AbrirCajaDiaria).ejecutar(req.context, input);
      res.status(201).json(turno);
    }),
  );

  router.post(
    "/caja-diaria/:id/cerrar",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cajaDiariaId = z.string().uuid().parse(req.params.id);
      const input = cerrarCajaDiariaSchema.parse(req.body);
      const turno = await container.get(CerrarCajaDiaria).ejecutar(req.context, { cajaDiariaId, ...input });
      res.status(200).json(turno);
    }),
  );

  router.get(
    "/caja-diaria",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cajaId = req.query.cajaId ? z.string().uuid().parse(req.query.cajaId) : undefined;
      const turnos = await container.get(ListarCajasDiarias).ejecutar(req.context.empresaId, cajaId);
      res.status(200).json(turnos);
    }),
  );

  router.post(
    "/cuentas-bancarias/:id/conciliacion",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cuentaBancariaId = z.string().uuid().parse(req.params.id);
      const input = importarExtractoBancarioSchema.parse(req.body);
      const lineas = await container
        .get(ImportarExtractoBancario)
        .ejecutar(req.context, { cuentaBancariaId, lineas: input.lineas });
      res.status(201).json(lineas);
    }),
  );

  router.get(
    "/cuentas-bancarias/:id/conciliacion",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const cuentaBancariaId = z.string().uuid().parse(req.params.id);
      const resultado = await container.get(ListarConciliacion).ejecutar(req.context.empresaId, cuentaBancariaId);
      res.status(200).json(resultado);
    }),
  );

  router.post(
    "/conciliacion/:id/conciliar",
    authMiddleware,
    empresaContextMiddleware,
    asyncHandler(async (req, res) => {
      if (!req.context) throw AppError.unauthorized();
      const lineaId = z.string().uuid().parse(req.params.id);
      const input = conciliarLineaManualSchema.parse(req.body);
      const linea = await container.get(ConciliarLineaManual).ejecutar(req.context, lineaId, input.asientoId);
      res.status(200).json(linea);
    }),
  );

  return router;
}
