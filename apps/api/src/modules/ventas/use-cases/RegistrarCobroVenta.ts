import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { VentaComprobanteRepository } from "../infra/VentaComprobanteRepository.js";
import { VentaCobroRepository, type Cobro } from "../infra/VentaCobroRepository.js";
import { ClienteRepository } from "../infra/ClienteRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { GenerarAsientoDesdeComprobante } from "../../contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";
import {
  aplicacionCoincideConTotal,
  mediosCoincidenConTotal,
  type CobroComprobanteInput,
  type CobroMedioInput,
  type NuevoCobro,
} from "../domain/Cobro.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface RegistrarCobroVentaInput {
  clienteId: string;
  fecha: Date;
  importeTotal: number;
  medios: CobroMedioInput[];
  comprobantes: CobroComprobanteInput[];
}

/**
 * Cada medio de cobro imputa a una cuenta distinta del debe (nota 07 "de
 * fabrica"): caja/cuenta bancaria suben un activo, tarjeta sube el activo
 * "tarjetas de credito a cobrar" (a liquidar por el procesador), cheque de
 * tercero sube el activo "cheques de terceros en cartera". CHEQUE_PROPIO
 * queda sin cuenta mapeada en v1 — recibir de vuelta un cheque propio como
 * cobro es un caso borde no contemplado en el plan de cuentas de fabrica.
 */
const VARIABLE_POR_MEDIO: Record<CobroMedioInput["medio"], string | null> = {
  CAJA: "CAJA_TOTAL",
  CUENTA_BANCARIA: "CUENTA_TOTAL",
  TARJETA: "TARJETA_TOTAL",
  CHEQUE_TERCERO: "CHEQUE_TERCERO_TOTAL",
  CHEQUE_PROPIO: null,
};

/**
 * POST /ventas/cobros (nota 08, seccion 3, espejado de compras/RegistrarPago):
 * registra un cobro a cliente, lo aplica contra 1+ comprobantes confirmados
 * (descontando saldo_pendiente) y dispara el modelo COBRO_ASIENTO. Sin
 * retenciones (exclusivas de compras). El cobro se persiste primero — recien
 * ahi existe cobro.id para pasarlo como comprobanteOrigen del asiento.
 */
@injectable()
export class RegistrarCobroVenta {
  constructor(
    @inject(VentaCobroRepository) private readonly ventaCobroRepository: VentaCobroRepository,
    @inject(VentaComprobanteRepository) private readonly ventaComprobanteRepository: VentaComprobanteRepository,
    @inject(ClienteRepository) private readonly clienteRepository: ClienteRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(GenerarAsientoDesdeComprobante) private readonly generarAsientoDesdeComprobante: GenerarAsientoDesdeComprobante,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarCobroVentaInput): Promise<Cobro> {
    const cliente = await this.clienteRepository.buscarPorIdYEmpresa(input.clienteId, context.empresaId);
    if (!cliente) {
      throw AppError.notFound("Cliente no encontrado en esta empresa");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) {
      throw AppError.notFound("Empresa no encontrada");
    }

    if (!input.medios.length) {
      throw AppError.badRequest("Debe informar al menos un medio de cobro");
    }
    if (!input.comprobantes.length) {
      throw AppError.badRequest("Debe informar al menos un comprobante a cancelar");
    }

    const nuevoCobro: NuevoCobro = {
      clienteId: input.clienteId,
      fecha: input.fecha,
      importeTotal: input.importeTotal,
      medios: input.medios,
      comprobantes: input.comprobantes,
    };

    if (!mediosCoincidenConTotal(nuevoCobro)) {
      throw AppError.badRequest(
        "La suma de los medios de cobro no coincide con el importe total",
        "COBRO_MEDIOS_INCONSISTENTES",
      );
    }
    if (!aplicacionCoincideConTotal(nuevoCobro)) {
      throw new AppError(
        422,
        "La aplicacion a comprobantes no agota el importe total del cobro",
        "COBRO_APLICACION_INCONSISTENTE",
      );
    }

    for (const aplicacion of input.comprobantes) {
      const comprobante = await this.ventaComprobanteRepository.buscarPorIdYEmpresa(
        aplicacion.comprobanteId,
        context.empresaId,
      );
      if (!comprobante) {
        throw AppError.notFound(`Comprobante ${aplicacion.comprobanteId} no encontrado`);
      }
      if (comprobante.clienteId !== input.clienteId) {
        throw AppError.badRequest(`El comprobante ${aplicacion.comprobanteId} no pertenece al cliente informado`);
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
          "COBRO_EXCEDE_SALDO",
        );
      }
    }

    const variables: Record<string, number> = {
      COBRO_TOTAL: input.importeTotal,
      CAJA_TOTAL: 0,
      CUENTA_TOTAL: 0,
      TARJETA_TOTAL: 0,
      CHEQUE_TERCERO_TOTAL: 0,
    };
    for (const medio of input.medios) {
      const variable = VARIABLE_POR_MEDIO[medio.medio];
      if (variable) {
        variables[variable] = (variables[variable] ?? 0) + medio.importe;
      }
    }

    const cobro = await this.ventaCobroRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      clienteId: input.clienteId,
      fecha: input.fecha,
      importeTotal: input.importeTotal,
      medios: input.medios,
      comprobantes: input.comprobantes,
    });

    await this.generarAsientoDesdeComprobante.ejecutar({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cierreEjercicioMMDD: empresa.cierreEjercicio,
      evento: "COBRO_ASIENTO",
      fecha: input.fecha,
      leyenda: `Cobro a cliente ${cliente.razonSocial}`,
      comprobanteOrigen: { tipo: "cobro", id: cobro.id },
      variables,
    });

    return cobro;
  }
}
