import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { AsientoRepository, type FiltrosAsiento, type MovimientoMayor } from "../infra/AsientoRepository.js";
import { PlanCuentaRepository } from "../infra/PlanCuentaRepository.js";
import type { CuentaContable } from "../domain/CuentaContable.js";

export interface LineaLibroMayor extends MovimientoMayor {
  /** Saldo acumulado hasta esta linea inclusive: DEBE suma, HABER resta — no supone cual es el lado "normal" de la cuenta. */
  saldo: number;
}

export interface LibroMayorResultado {
  cuenta: CuentaContable;
  lineas: LineaLibroMayor[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

/**
 * Libro Mayor de una cuenta (nota 11 cnt_movimiento filtrado por cuenta):
 * GET /contabilidad/libro-mayor?cuentaId=&desde=&hasta=. A diferencia de
 * Nacional Sistema (cnt_cuenta.saldo guardaba el lado "normal" de cada
 * cuenta), el plan de cuentas de AP-Contadores no tiene ese campo — el saldo
 * acumulado se muestra siempre como DEBE-HABER, positivo o negativo, sin
 * asumir el lado natural de la cuenta.
 */
@injectable()
export class ObtenerLibroMayor {
  constructor(
    @inject(AsientoRepository) private readonly asientoRepository: AsientoRepository,
    @inject(PlanCuentaRepository) private readonly planCuentaRepository: PlanCuentaRepository,
  ) {}

  async ejecutar(empresaId: string, cuentaId: string, filtros: FiltrosAsiento = {}): Promise<LibroMayorResultado> {
    const cuenta = await this.planCuentaRepository.buscarPorIdYEmpresa(cuentaId, empresaId);
    if (!cuenta) throw AppError.notFound("Cuenta contable no encontrada");

    const movimientos = await this.asientoRepository.listarMovimientosPorCuenta(empresaId, cuentaId, filtros);

    let acumulado = 0;
    let totalDebe = 0;
    let totalHaber = 0;
    const lineas: LineaLibroMayor[] = movimientos.map((m) => {
      if (m.lado === "DEBE") {
        acumulado += m.importe;
        totalDebe += m.importe;
      } else {
        acumulado -= m.importe;
        totalHaber += m.importe;
      }
      return { ...m, saldo: acumulado };
    });

    return { cuenta, lineas, totalDebe, totalHaber, saldoFinal: acumulado };
  }
}
