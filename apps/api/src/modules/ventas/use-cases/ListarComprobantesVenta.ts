import { inject, injectable } from "inversify";
import { VentaComprobanteRepository, type FiltrosComprobanteVenta } from "../infra/VentaComprobanteRepository.js";
import type { ComprobanteVenta } from "../domain/ComprobanteVenta.js";

/** GET /ventas/comprobantes?estado=&cliente=&desde=&hasta= (nota 08, seccion 5). */
@injectable()
export class ListarComprobantesVenta {
  constructor(@inject(VentaComprobanteRepository) private readonly ventaComprobanteRepository: VentaComprobanteRepository) {}

  async ejecutar(empresaId: string, filtros: FiltrosComprobanteVenta): Promise<ComprobanteVenta[]> {
    return this.ventaComprobanteRepository.listarPorEmpresa(empresaId, filtros);
  }
}
