import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import { ConciliacionBancariaRepository } from "../infra/ConciliacionBancariaRepository.js";
import { AsientoRepository, type MovimientoMayor } from "../../contabilidad/infra/AsientoRepository.js";
import type { ConciliacionBancaria } from "../domain/ConciliacionBancaria.js";

export interface ConciliacionDeCuenta {
  lineas: ConciliacionBancaria[];
  /** Movimientos del Libro Mayor de la cuenta que todavia no se usaron como match — para elegir a mano. */
  movimientosDisponibles: MovimientoMayor[];
}

/** GET /tesoreria/cuentas-bancarias/:id/conciliacion (nota 22, seccion 6). */
@injectable()
export class ListarConciliacion {
  constructor(
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
    @inject(ConciliacionBancariaRepository) private readonly conciliacionBancariaRepository: ConciliacionBancariaRepository,
    @inject(AsientoRepository) private readonly asientoRepository: AsientoRepository,
  ) {}

  async ejecutar(empresaId: string, cuentaBancariaId: string): Promise<ConciliacionDeCuenta> {
    const cuenta = await this.cuentaBancariaRepository.buscarPorIdYEmpresa(cuentaBancariaId, empresaId);
    if (!cuenta) {
      throw AppError.notFound("Cuenta bancaria no encontrada en esta empresa");
    }

    const [lineas, movimientos, yaConciliados] = await Promise.all([
      this.conciliacionBancariaRepository.listarPorCuenta(cuenta.id, empresaId),
      this.asientoRepository.listarMovimientosPorCuenta(empresaId, cuenta.cuentaContableId),
      this.conciliacionBancariaRepository.listarAsientosYaConciliados(cuenta.id),
    ]);

    return {
      lineas,
      movimientosDisponibles: movimientos.filter((m) => !yaConciliados.has(m.asientoId)),
    };
  }
}
