import { inject, injectable } from "inversify";
import { ChequeraRepository } from "../infra/ChequeraRepository.js";
import type { Chequera } from "../domain/Chequera.js";

/** GET /tesoreria/chequeras. */
@injectable()
export class ListarChequeras {
  constructor(@inject(ChequeraRepository) private readonly chequeraRepository: ChequeraRepository) {}

  async ejecutar(empresaId: string): Promise<Chequera[]> {
    return this.chequeraRepository.listarPorEmpresa(empresaId);
  }
}
