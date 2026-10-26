import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { TarjetaRepository } from "../infra/TarjetaRepository.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Tarjeta } from "../domain/Tarjeta.js";

export interface RegistrarTarjetaInput {
  nombre: string;
  cuentaLiquidadoraId: string;
}

/** POST /tesoreria/tarjetas (nota 22, seccion 6). */
@injectable()
export class RegistrarTarjeta {
  constructor(
    @inject(TarjetaRepository) private readonly tarjetaRepository: TarjetaRepository,
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarTarjetaInput): Promise<Tarjeta> {
    const cuenta = await this.cuentaBancariaRepository.buscarPorIdYEmpresa(input.cuentaLiquidadoraId, context.empresaId);
    if (!cuenta) {
      throw AppError.notFound("Cuenta liquidadora no encontrada en esta empresa");
    }

    return this.tarjetaRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      nombre: input.nombre,
      cuentaLiquidadoraId: input.cuentaLiquidadoraId,
    });
  }
}
