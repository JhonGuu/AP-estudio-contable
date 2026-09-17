import { injectable } from "inversify";
import { TipoComprobanteRepository } from "../infra/TipoComprobanteRepository.js";
import type { AplicaA, TipoComprobante } from "../domain/TipoComprobante.js";

/** GET /tipos-comprobante (nota 08, seccion 5). */
@injectable()
export class ListarTiposComprobante {
  constructor(private readonly tipoComprobanteRepository: TipoComprobanteRepository) {}

  async ejecutar(aplicaA?: AplicaA): Promise<TipoComprobante[]> {
    return this.tipoComprobanteRepository.listar(aplicaA);
  }
}
