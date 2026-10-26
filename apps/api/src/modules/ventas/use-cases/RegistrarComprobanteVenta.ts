import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { VentaComprobanteRepository } from "../infra/VentaComprobanteRepository.js";
import { ClienteRepository } from "../infra/ClienteRepository.js";
import { ComprobanteSecuenciaRepository } from "../../comprobantes/infra/ComprobanteSecuenciaRepository.js";
import { PuntoVentaRepository } from "../../comprobantes/infra/PuntoVentaRepository.js";
import { TipoComprobanteRepository } from "../../comprobantes/infra/TipoComprobanteRepository.js";
import {
  totalesCoinciden,
  type ComprobanteVenta,
  type ComprobanteVentaCuotaInput,
  type ComprobanteVentaImpuestoInput,
  type ComprobanteVentaItemInput,
} from "../domain/ComprobanteVenta.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface RegistrarComprobanteVentaInput {
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: Date;
  rubro?: number;
  netoTotal: number;
  exentoTotal?: number;
  noGravadoTotal?: number;
  importeTotal: number;
  items: ComprobanteVentaItemInput[];
  impuestos: ComprobanteVentaImpuestoInput[];
  cuotas?: ComprobanteVentaCuotaInput[];
}

/**
 * POST /ventas/comprobantes (nota 08, seccion 4 y 5, espejado de compras):
 * carga un comprobante de venta en estado BORRADOR. Rechaza sin grabar nada
 * si Neto+IVA+otros != Total. Las cuotas (si las hay, nota 08 seccion 2) son
 * seguimiento de cobranza — no participan de esta validacion.
 */
@injectable()
export class RegistrarComprobanteVenta {
  constructor(
    @inject(VentaComprobanteRepository) private readonly ventaComprobanteRepository: VentaComprobanteRepository,
    @inject(ClienteRepository) private readonly clienteRepository: ClienteRepository,
    @inject(PuntoVentaRepository) private readonly puntoVentaRepository: PuntoVentaRepository,
    @inject(TipoComprobanteRepository) private readonly tipoComprobanteRepository: TipoComprobanteRepository,
    @inject(ComprobanteSecuenciaRepository) private readonly comprobanteSecuenciaRepository: ComprobanteSecuenciaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarComprobanteVentaInput): Promise<ComprobanteVenta> {
    const cliente = await this.clienteRepository.buscarPorIdYEmpresa(input.clienteId, context.empresaId);
    if (!cliente) throw AppError.notFound("Cliente no encontrado en esta empresa");

    const puntoVenta = await this.puntoVentaRepository.buscarPorIdYEmpresa(input.puntoVentaId, context.empresaId);
    if (!puntoVenta) throw AppError.notFound("Punto de venta no encontrado en esta empresa");

    const tipoComprobante = await this.tipoComprobanteRepository.buscarPorId(input.tipoComprobanteId);
    if (!tipoComprobante || (tipoComprobante.aplicaA !== "VENTA" && tipoComprobante.aplicaA !== "AMBOS")) {
      throw AppError.badRequest("Tipo de comprobante invalido para ventas", "TIPO_COMPROBANTE_INVALIDO");
    }

    const datosParaValidar = {
      clienteId: input.clienteId,
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
      cuotas: input.cuotas ?? [],
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

    return this.ventaComprobanteRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      clienteId: datosParaValidar.clienteId,
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
      cuotas: datosParaValidar.cuotas,
    });
  }
}
