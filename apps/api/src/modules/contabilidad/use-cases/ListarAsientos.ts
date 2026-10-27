import { inject, injectable } from "inversify";
import { AsientoRepository, type AsientoConMovimientos, type FiltrosAsiento } from "../infra/AsientoRepository.js";

/** Libro Diario (nota 11 cnt_asiento): GET /contabilidad/asientos?desde=&hasta= */
@injectable()
export class ListarAsientos {
  constructor(@inject(AsientoRepository) private readonly asientoRepository: AsientoRepository) {}

  async ejecutar(empresaId: string, filtros: FiltrosAsiento = {}): Promise<AsientoConMovimientos[]> {
    return this.asientoRepository.listarPorEmpresa(empresaId, filtros);
  }
}
