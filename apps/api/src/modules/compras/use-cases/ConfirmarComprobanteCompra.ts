import { injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CompraComprobanteRepository } from "../infra/CompraComprobanteRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { GenerarAsientoDesdeComprobante } from "../../contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";
import { TIPOS_IMPUESTO } from "../../contabilidad/domain/ContextoEvaluacionContable.js";
import { puedeConfirmarse, sumaImpuestoPorTipo, type ComprobanteCompra } from "../domain/ComprobanteCompra.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

/**
 * POST /compras/comprobantes/:id/confirmar (nota 08, seccion 4): confirma el
 * comprobante y dispara GenerarAsientoDesdeComprobante con el modelo
 * ASIENTO_COMPRA (nota 07/21). Si el asiento no cierra o no hay modelo
 * configurado, no se confirma nada (el use-case de contabilidad ya rechaza
 * sin persistir en ese caso).
 */
@injectable()
export class ConfirmarComprobanteCompra {
  constructor(
    private readonly compraComprobanteRepository: CompraComprobanteRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly generarAsientoDesdeComprobante: GenerarAsientoDesdeComprobante,
  ) {}

  async ejecutar(context: EmpresaContext, comprobanteId: string): Promise<ComprobanteCompra> {
    const comprobante = await this.compraComprobanteRepository.buscarPorIdYEmpresa(comprobanteId, context.empresaId);
    if (!comprobante) throw AppError.notFound("Comprobante de compra no encontrado");
    if (!puedeConfirmarse(comprobante)) {
      throw AppError.conflict(`No se puede confirmar un comprobante en estado ${comprobante.estado}`, "ESTADO_INVALIDO");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) throw AppError.notFound("Empresa no encontrada");

    const impuestos = await this.compraComprobanteRepository.obtenerImpuestos(comprobante.id);

    await this.generarAsientoDesdeComprobante.ejecutar({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cierreEjercicioMMDD: empresa.cierreEjercicio,
      evento: "ASIENTO_COMPRA",
      fecha: comprobante.fecha,
      leyenda: `Compra ${comprobante.numero} — comprobante ${comprobante.id}`,
      comprobanteOrigen: { tipo: "compra", id: comprobante.id },
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

    await this.compraComprobanteRepository.confirmar(comprobante.id);
    return { ...comprobante, estado: "CONFIRMADO" };
  }
}
