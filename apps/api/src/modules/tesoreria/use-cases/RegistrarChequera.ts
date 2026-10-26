import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ChequeraRepository } from "../infra/ChequeraRepository.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Chequera } from "../domain/Chequera.js";

export interface RegistrarChequeraInput {
  cuentaBancariaId: string;
  numeroDesde: number;
  numeroHasta: number;
}

/** POST /tesoreria/chequeras — ABM del talonario de cheques propios de una cuenta. */
@injectable()
export class RegistrarChequera {
  constructor(
    @inject(ChequeraRepository) private readonly chequeraRepository: ChequeraRepository,
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarChequeraInput): Promise<Chequera> {
    const cuenta = await this.cuentaBancariaRepository.buscarPorIdYEmpresa(input.cuentaBancariaId, context.empresaId);
    if (!cuenta) {
      throw AppError.notFound("Cuenta bancaria no encontrada en esta empresa");
    }
    if (input.numeroHasta <= input.numeroDesde) {
      throw AppError.badRequest("numeroHasta debe ser mayor a numeroDesde");
    }

    return this.chequeraRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cuentaBancariaId: input.cuentaBancariaId,
      numeroDesde: input.numeroDesde,
      numeroHasta: input.numeroHasta,
    });
  }
}
