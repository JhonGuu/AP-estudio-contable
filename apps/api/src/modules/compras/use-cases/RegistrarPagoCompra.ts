import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CompraComprobanteRepository } from "../infra/CompraComprobanteRepository.js";
import { CompraPagoRepository, type Pago } from "../infra/CompraPagoRepository.js";
import { ProveedorRepository } from "../infra/ProveedorRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { GenerarAsientoDesdeComprobante } from "../../contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";
import {
  aplicacionCoincideConTotal,
  mediosCoincidenConTotal,
  type NuevoPago,
  type PagoComprobanteInput,
  type PagoMedioInput,
  type RetencionInput,
} from "../domain/Pago.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface RegistrarPagoCompraInput {
  proveedorId: string;
  fecha: Date;
  importeTotal: number;
  medios: PagoMedioInput[];
  comprobantes: PagoComprobanteInput[];
  retenciones?: RetencionInput[];
}

/**
 * Cada medio de pago imputa a una cuenta distinta del haber (nota 07 "de
 * fabrica"): caja/cuenta bancaria bajan un activo, cheque propio sube el
 * pasivo "cheques emitidos a pagar", cheque de tercero baja el activo
 * "cheques de terceros en cartera" (se entrega un cheque que se tenia en
 * cartera), tarjeta sube el pasivo "tarjeta corporativa a pagar" (nota 22 —
 * antes quedaba sin cuenta mapeada y el asiento se rechazaba desbalanceado).
 */
const VARIABLE_POR_MEDIO: Record<PagoMedioInput["medio"], string | null> = {
  CAJA: "CAJA_TOTAL",
  CUENTA_BANCARIA: "CUENTA_TOTAL",
  CHEQUE_PROPIO: "CHEQUE_PROPIO_TOTAL",
  CHEQUE_TERCERO: "CHEQUE_TERCERO_TOTAL",
  /** Tarjeta corporativa a pagar (nota 22) — cierra el hueco que dejaba esto en null. */
  TARJETA: "TARJETA_TOTAL",
};

/**
 * POST /compras/pagos (nota 08, seccion 3): registra un pago a proveedor,
 * lo aplica contra 1+ comprobantes confirmados (descontando saldo_pendiente,
 * nota 08 "una factura puede cobrarse en partes") y dispara el modelo
 * PAGO_ASIENTO. El pago se persiste primero — recien ahi existe pago.id para
 * pasarlo como comprobanteOrigen del asiento.
 */
@injectable()
export class RegistrarPagoCompra {
  constructor(
    @inject(CompraPagoRepository) private readonly compraPagoRepository: CompraPagoRepository,
    @inject(CompraComprobanteRepository) private readonly compraComprobanteRepository: CompraComprobanteRepository,
    @inject(ProveedorRepository) private readonly proveedorRepository: ProveedorRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(GenerarAsientoDesdeComprobante) private readonly generarAsientoDesdeComprobante: GenerarAsientoDesdeComprobante,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarPagoCompraInput): Promise<Pago> {
    const proveedor = await this.proveedorRepository.buscarPorIdYEmpresa(input.proveedorId, context.empresaId);
    if (!proveedor) {
      throw AppError.notFound("Proveedor no encontrado en esta empresa");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) {
      throw AppError.notFound("Empresa no encontrada");
    }

    if (!input.medios.length) {
      throw AppError.badRequest("Debe informar al menos un medio de pago");
    }
    if (!input.comprobantes.length) {
      throw AppError.badRequest("Debe informar al menos un comprobante a cancelar");
    }

    const retenciones = input.retenciones ?? [];

    const nuevoPago: NuevoPago = {
      proveedorId: input.proveedorId,
      fecha: input.fecha,
      importeTotal: input.importeTotal,
      medios: input.medios,
      comprobantes: input.comprobantes,
      retenciones,
    };

    if (!mediosCoincidenConTotal(nuevoPago)) {
      throw AppError.badRequest(
        "La suma de los medios de pago mas las retenciones no coincide con el importe total",
        "PAGO_MEDIOS_INCONSISTENTES",
      );
    }
    if (!aplicacionCoincideConTotal(nuevoPago)) {
      throw new AppError(
        422,
        "La aplicacion a comprobantes no agota el importe total del pago",
        "PAGO_APLICACION_INCONSISTENTE",
      );
    }

    for (const aplicacion of input.comprobantes) {
      const comprobante = await this.compraComprobanteRepository.buscarPorIdYEmpresa(
        aplicacion.comprobanteId,
        context.empresaId,
      );
      if (!comprobante) {
        throw AppError.notFound(`Comprobante ${aplicacion.comprobanteId} no encontrado`);
      }
      if (comprobante.proveedorId !== input.proveedorId) {
        throw AppError.badRequest(`El comprobante ${aplicacion.comprobanteId} no pertenece al proveedor informado`);
      }
      if (comprobante.estado !== "CONFIRMADO") {
        throw new AppError(
          422,
          `El comprobante ${aplicacion.comprobanteId} no esta confirmado`,
          "COMPROBANTE_NO_CONFIRMADO",
        );
      }
      if (aplicacion.importeAplicado > comprobante.saldoPendiente + 0.005) {
        throw new AppError(
          422,
          `El importe aplicado al comprobante ${aplicacion.comprobanteId} excede su saldo pendiente`,
          "PAGO_EXCEDE_SALDO",
        );
      }
    }

    const variables: Record<string, number> = {
      PAGO_TOTAL: input.importeTotal,
      CAJA_TOTAL: 0,
      CUENTA_TOTAL: 0,
      CHEQUE_PROPIO_TOTAL: 0,
      CHEQUE_TERCERO_TOTAL: 0,
      TARJETA_TOTAL: 0,
      RETENCIONES_TOTAL: 0,
    };
    for (const medio of input.medios) {
      const variable = VARIABLE_POR_MEDIO[medio.medio];
      if (variable) {
        variables[variable] = (variables[variable] ?? 0) + medio.importe;
      }
    }
    for (const retencion of retenciones) {
      variables.RETENCIONES_TOTAL = (variables.RETENCIONES_TOTAL ?? 0) + retencion.importe;
    }

    const pago = await this.compraPagoRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      proveedorId: input.proveedorId,
      fecha: input.fecha,
      importeTotal: input.importeTotal,
      medios: input.medios,
      comprobantes: input.comprobantes,
      retenciones,
    });

    await this.generarAsientoDesdeComprobante.ejecutar({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cierreEjercicioMMDD: empresa.cierreEjercicio,
      evento: "PAGO_ASIENTO",
      fecha: input.fecha,
      leyenda: `Pago a proveedor ${proveedor.razonSocial}`,
      comprobanteOrigen: { tipo: "pago", id: pago.id },
      variables,
    });

    return pago;
  }
}
