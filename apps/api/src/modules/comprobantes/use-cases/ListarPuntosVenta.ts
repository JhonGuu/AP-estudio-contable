import { inject, injectable } from "inversify";
import { PuntoVentaRepository } from "../infra/PuntoVentaRepository.js";
import type { PuntoVenta } from "../domain/PuntoVenta.js";

/** GET /puntos-venta (nota 08, seccion 5). */
@injectable()
export class ListarPuntosVenta {
  constructor(@inject(PuntoVentaRepository) private readonly puntoVentaRepository: PuntoVentaRepository) {}

  async ejecutar(empresaId: string): Promise<PuntoVenta[]> {
    return this.puntoVentaRepository.listarPorEmpresa(empresaId);
  }
}
