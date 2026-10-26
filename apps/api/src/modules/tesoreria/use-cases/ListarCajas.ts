import { inject, injectable } from "inversify";
import { CajaRepository } from "../infra/CajaRepository.js";
import type { Caja } from "../domain/Caja.js";

/** GET /tesoreria/cajas. */
@injectable()
export class ListarCajas {
  constructor(@inject(CajaRepository) private readonly cajaRepository: CajaRepository) {}

  async ejecutar(empresaId: string): Promise<Caja[]> {
    return this.cajaRepository.listarPorEmpresa(empresaId);
  }
}
