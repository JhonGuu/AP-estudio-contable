import { inject, injectable } from "inversify";
import { CompraComprobanteRepository, type FiltrosComprobanteCompra } from "../infra/CompraComprobanteRepository.js";
import type { ComprobanteCompra } from "../domain/ComprobanteCompra.js";

/** GET /compras/comprobantes?estado=&proveedor=&desde=&hasta= (nota 08, seccion 5). */
@injectable()
export class ListarComprobantesCompra {
  constructor(@inject(CompraComprobanteRepository) private readonly compraComprobanteRepository: CompraComprobanteRepository) {}

  async ejecutar(empresaId: string, filtros: FiltrosComprobanteCompra): Promise<ComprobanteCompra[]> {
    return this.compraComprobanteRepository.listarPorEmpresa(empresaId, filtros);
  }
}
