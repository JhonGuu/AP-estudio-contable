import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CompraComprobanteRepository } from "../infra/CompraComprobanteRepository.js";
import { ProveedorRepository } from "../infra/ProveedorRepository.js";
import { ComprobanteSecuenciaRepository } from "../../comprobantes/infra/ComprobanteSecuenciaRepository.js";
import { PuntoVentaRepository } from "../../comprobantes/infra/PuntoVentaRepository.js";
import { TipoComprobanteRepository } from "../../comprobantes/infra/TipoComprobanteRepository.js";
import {
  totalesCoinciden,
  type ComprobanteCompra,
  type ComprobanteCompraImpuestoInput,
  type ComprobanteCompraItemInput,
} from "../domain/ComprobanteCompra.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface RegistrarComprobanteCompraInput {
  proveedorId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: Date;
  rubro?: number;
  netoTotal: number;
  exentoTotal?: number;
  noGravadoTotal?: number;
  importeTotal: number;
  items: ComprobanteCompraItemInput[];
  impuestos: ComprobanteCompraImpuestoInput[];
}

/**
 * POST /compras/comprobantes (nota 08, seccion 4 y 5): carga un comprobante
 * de compra en estado BORRADOR. Rechaza sin grabar nada si Neto+IVA+otros !=
 * Total (flowchart de nota 08, seccion 4).
 */
@injectable()
export class RegistrarComprobanteCompra {
  constructor(
    @inject(CompraComprobanteRepository) private readonly compraComprobanteRepository: CompraComprobanteRepository,
    @inject(ProveedorRepository) private readonly proveedorRepository: ProveedorRepository,
    @inject(PuntoVentaRepository) private readonly puntoVentaRepository: PuntoVentaRepository,
    @inject(TipoComprobanteRepository) private readonly tipoComprobanteRepository: TipoComprobanteRepository,
    @inject(ComprobanteSecuenciaRepository) private readonly comprobanteSecuenciaRepository: ComprobanteSecuenciaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarComprobanteCompraInput): Promise<ComprobanteCompra> {
    const proveedor = await this.proveedorRepository.buscarPorIdYEmpresa(input.proveedorId, context.empresaId);
    if (!proveedor) throw AppError.notFound("Proveedor no encontrado en esta empresa");

    const puntoVenta = await this.puntoVentaRepository.buscarPorIdYEmpresa(input.puntoVentaId, context.empresaId);
    if (!puntoVenta) throw AppError.notFound("Punto de venta no encontrado en esta empresa");

    const tipoComprobante = await this.tipoComprobanteRepository.buscarPorId(input.tipoComprobanteId);
    if (!tipoComprobante || (tipoComprobante.aplicaA !== "COMPRA" && tipoComprobante.aplicaA !== "AMBOS")) {
      throw AppError.badRequest("Tipo de comprobante invalido para compras", "TIPO_COMPROBANTE_INVALIDO");
    }

    const datosParaValidar = {
      proveedorId: input.proveedorId,
      tipoComprobanteId: input.tipoComprobanteId,
      puntoVentaId: input.puntoVentaId,
      fecha: input.fecha,
      rubro: input.rubro ?? 1,
      netoTotal: input.netoTotal,
      exentoTotal: input.exentoTotal ?? 0,
      noGravadoTotal: input.noGravadoTotal ?? 0,
      importeTotal: input.importeTotal,
      items: input.items,
      impuestos: input.impuestos,
    };

    if (!totalesCoinciden(datosParaValidar)) {
      throw AppError.badRequest(
        "Neto + exento + no gravado + impuestos no coincide con el importe total declarado",
        "TOTALES_COMPROBANTE_NO_COINCIDEN",
      );
    }

    const numero = await this.comprobanteSecuenciaRepository.siguienteNumero(
      input.puntoVentaId,
      input.tipoComprobanteId,
    );

    return this.compraComprobanteRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      proveedorId: datosParaValidar.proveedorId,
      tipoComprobanteId: datosParaValidar.tipoComprobanteId,
      puntoVentaId: datosParaValidar.puntoVentaId,
      numero,
      fecha: datosParaValidar.fecha,
      rubro: datosParaValidar.rubro,
      netoTotal: datosParaValidar.netoTotal,
      exentoTotal: datosParaValidar.exentoTotal,
      noGravadoTotal: datosParaValidar.noGravadoTotal,
      importeTotal: datosParaValidar.importeTotal,
      items: datosParaValidar.items,
      impuestos: datosParaValidar.impuestos,
    });
  }
}
