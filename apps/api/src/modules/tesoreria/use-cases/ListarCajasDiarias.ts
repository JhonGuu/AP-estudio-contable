import { inject, injectable } from "inversify";
import { CajaDiariaRepository } from "../infra/CajaDiariaRepository.js";
import type { CajaDiaria } from "../domain/CajaDiaria.js";

/** GET /tesoreria/caja-diaria?cajaId= (nota 22, seccion 6). */
@injectable()
export class ListarCajasDiarias {
  constructor(@inject(CajaDiariaRepository) private readonly cajaDiariaRepository: CajaDiariaRepository) {}

  async ejecutar(empresaId: string, cajaId?: string): Promise<CajaDiaria[]> {
    return this.cajaDiariaRepository.listarPorEmpresa(empresaId, cajaId);
  }
}
