import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ConciliacionBancariaRepository } from "../infra/ConciliacionBancariaRepository.js";
import type { ConciliacionBancaria } from "../domain/ConciliacionBancaria.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

/** POST /tesoreria/conciliacion/:id/conciliar (nota 22, seccion 6) — match manual para lo que el automatico dejo PENDIENTE. */
@injectable()
export class ConciliarLineaManual {
  constructor(
    @inject(ConciliacionBancariaRepository) private readonly conciliacionBancariaRepository: ConciliacionBancariaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, lineaId: string, asientoId: string): Promise<ConciliacionBancaria> {
    const linea = await this.conciliacionBancariaRepository.buscarPorIdYEmpresa(lineaId, context.empresaId);
    if (!linea) {
      throw AppError.notFound("Linea de conciliacion no encontrada en esta empresa");
    }
    if (linea.estado === "CONCILIADA") {
      throw new AppError(422, "Esta linea ya esta conciliada", "LINEA_YA_CONCILIADA");
    }

    const yaUsado = await this.conciliacionBancariaRepository.listarAsientosYaConciliados(linea.cuentaBancariaId);
    if (yaUsado.has(asientoId)) {
      throw new AppError(422, "Ese movimiento ya fue usado para conciliar otra linea", "ASIENTO_YA_CONCILIADO");
    }

    return this.conciliacionBancariaRepository.marcarConciliada(linea.id, asientoId);
  }
}
