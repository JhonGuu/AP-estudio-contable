import { inject, injectable } from "inversify";
import { PlanCuentaRepository } from "../infra/PlanCuentaRepository.js";
import type { CuentaContable } from "../domain/CuentaContable.js";

/**
 * GET /contabilidad/plan-cuentas. Cierra el hueco documentado en la sesion
 * de pantallas de frontend (2026-10-26): sin esto, Tesoreria (Caja/Cuenta
 * Bancaria/Tarjeta) no podia ofrecer un selector de cuentaContableId /
 * cuentaLiquidadoraId y habia que buscarlas a mano por SQL.
 */
@injectable()
export class ListarPlanCuentas {
  constructor(@inject(PlanCuentaRepository) private readonly planCuentaRepository: PlanCuentaRepository) {}

  async ejecutar(empresaId: string): Promise<CuentaContable[]> {
    const cuentas = await this.planCuentaRepository.listarPorEmpresa(empresaId);
    return cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }
}
