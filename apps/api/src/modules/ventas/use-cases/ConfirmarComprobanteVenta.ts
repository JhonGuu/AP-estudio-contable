import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { VentaComprobanteRepository } from "../infra/VentaComprobanteRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { GenerarAsientoDesdeComprobante } from "../../contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";
import { TIPOS_IMPUESTO } from "../../contabilidad/domain/ContextoEvaluacionContable.js";
import { puedeConfirmarse, sumaImpuestoPorTipo, type ComprobanteVenta } from "../domain/ComprobanteVenta.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

/**
 * POST /ventas/comprobantes/:id/confirmar (nota 08, seccion 4, espejado de
 * compras): confirma el comprobante y dispara GenerarAsientoDesdeComprobante
 * con el modelo ASIENTO_VENTA (nota 07/21). La emision con CAE de AFIP es un
 * paso aparte, todavia no diseñado (nota 08, seccion 5).
 */
@injectable()
export class ConfirmarComprobanteVenta {
  constructor(
    @inject(VentaComprobanteRepository) private readonly ventaComprobanteRepository: VentaComprobanteRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(GenerarAsientoDesdeComprobante) private readonly generarAsientoDesdeComprobante: GenerarAsientoDesdeComprobante,
  ) {}

  async ejecutar(context: EmpresaContext, comprobanteId: string): Promise<ComprobanteVenta> {
    const comprobante = await this.ventaComprobanteRepository.buscarPorIdYEmpresa(comprobanteId, context.empresaId);
    if (!comprobante) throw AppError.notFound("Comprobante de venta no encontrado");
    if (!puedeConfirmarse(comprobante)) {
      throw AppError.conflict(`No se puede confirmar un comprobante en estado ${comprobante.estado}`, "ESTADO_INVALIDO");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) throw AppError.notFound("Empresa no encontrada");

    const impuestos = await this.ventaComprobanteRepository.obtenerImpuestos(comprobante.id);

    await this.generarAsientoDesdeComprobante.ejecutar({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cierreEjercicioMMDD: empresa.cierreEjercicio,
      evento: "ASIENTO_VENTA",
      fecha: comprobante.fecha,
      leyenda: `Venta ${comprobante.numero} — comprobante ${comprobante.id}`,
      comprobanteOrigen: { tipo: "venta", id: comprobante.id },
      variables: {
        RUBRO: comprobante.rubro,
        NETO_TOTAL: comprobante.netoTotal,
        EXENTO_TOTAL: comprobante.exentoTotal,
        NOGRAVADO_TOTAL: comprobante.noGravadoTotal,
        IMPORTE_TOTAL: comprobante.importeTotal,
      },
      impuestosPorCodigo: {
        [TIPOS_IMPUESTO.IVA]: sumaImpuestoPorTipo(impuestos, "IVA"),
        [TIPOS_IMPUESTO.IIBB]: sumaImpuestoPorTipo(impuestos, "IIBB"),
        [TIPOS_IMPUESTO.OTROS]: sumaImpuestoPorTipo(impuestos, "OTROS"),
      },
    });

    await this.ventaComprobanteRepository.confirmar(comprobante.id);
    return { ...comprobante, estado: "CONFIRMADO" };
  }
}
