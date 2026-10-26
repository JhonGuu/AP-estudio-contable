import { inject, injectable } from "inversify";
import { TarjetaRepository } from "../infra/TarjetaRepository.js";
import type { Tarjeta } from "../domain/Tarjeta.js";

/** GET /tesoreria/tarjetas. */
@injectable()
export class ListarTarjetas {
  constructor(@inject(TarjetaRepository) private readonly tarjetaRepository: TarjetaRepository) {}

  async ejecutar(empresaId: string): Promise<Tarjeta[]> {
    return this.tarjetaRepository.listarPorEmpresa(empresaId);
  }
}
