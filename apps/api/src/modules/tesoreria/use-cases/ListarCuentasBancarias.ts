import { inject, injectable } from "inversify";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { CuentaBancaria } from "../domain/CuentaBancaria.js";

/** GET /tesoreria/cuentas-bancarias. */
@injectable()
export class ListarCuentasBancarias {
  constructor(@inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository) {}

  async ejecutar(empresaId: string): Promise<CuentaBancaria[]> {
    return this.cuentaBancariaRepository.listarPorEmpresa(empresaId);
  }
}
