import { inject, injectable } from "inversify";
import { MovimientoFondoRepository } from "../infra/MovimientoFondoRepository.js";
import type { MovimientoFondo } from "../domain/MovimientoFondo.js";

/** GET /tesoreria/movimientos-fondo. */
@injectable()
export class ListarMovimientosFondo {
  constructor(@inject(MovimientoFondoRepository) private readonly movimientoFondoRepository: MovimientoFondoRepository) {}

  async ejecutar(empresaId: string): Promise<MovimientoFondo[]> {
    return this.movimientoFondoRepository.listarPorEmpresa(empresaId);
  }
}
