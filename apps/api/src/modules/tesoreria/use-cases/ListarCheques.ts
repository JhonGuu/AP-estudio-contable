import { inject, injectable } from "inversify";
import { ChequeRepository } from "../infra/ChequeRepository.js";
import type { Cheque } from "../domain/Cheque.js";

/** GET /tesoreria/cheques. */
@injectable()
export class ListarCheques {
  constructor(@inject(ChequeRepository) private readonly chequeRepository: ChequeRepository) {}

  async ejecutar(empresaId: string): Promise<Cheque[]> {
    return this.chequeRepository.listarPorEmpresa(empresaId);
  }
}
