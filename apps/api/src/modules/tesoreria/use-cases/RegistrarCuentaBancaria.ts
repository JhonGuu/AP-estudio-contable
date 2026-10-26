import { inject, injectable } from "inversify";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { CuentaBancaria } from "../domain/CuentaBancaria.js";

export interface RegistrarCuentaBancariaInput {
  nombre: string;
  cbu?: string | null;
  banco: string;
  monedaId: string;
  cuentaContableId: string;
}

/** POST /tesoreria/cuentas-bancarias (nota 22, seccion 6). */
@injectable()
export class RegistrarCuentaBancaria {
  constructor(@inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository) {}

  async ejecutar(context: EmpresaContext, input: RegistrarCuentaBancariaInput): Promise<CuentaBancaria> {
    return this.cuentaBancariaRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      nombre: input.nombre,
      cbu: input.cbu,
      banco: input.banco,
      monedaId: input.monedaId,
      cuentaContableId: input.cuentaContableId,
    });
  }
}
