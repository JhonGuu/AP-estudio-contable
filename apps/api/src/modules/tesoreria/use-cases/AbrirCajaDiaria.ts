import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CajaRepository } from "../infra/CajaRepository.js";
import { CajaDiariaRepository } from "../infra/CajaDiariaRepository.js";
import type { CajaDiaria } from "../domain/CajaDiaria.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface AbrirCajaDiariaInput {
  cajaId: string;
  fecha: Date;
}

/**
 * POST /tesoreria/caja-diaria/abrir (nota 22, seccion 6). Abre un turno
 * nuevo para una caja, tomando como `saldoApertura` el saldo que la caja
 * tiene en este momento (ya mantenido en tiempo real por cada pago/cobro/
 * movimiento de fondo aplicado). Una caja no puede tener dos turnos
 * abiertos a la vez.
 */
@injectable()
export class AbrirCajaDiaria {
  constructor(
    @inject(CajaRepository) private readonly cajaRepository: CajaRepository,
    @inject(CajaDiariaRepository) private readonly cajaDiariaRepository: CajaDiariaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: AbrirCajaDiariaInput): Promise<CajaDiaria> {
    const caja = await this.cajaRepository.buscarPorIdYEmpresa(input.cajaId, context.empresaId);
    if (!caja) {
      throw AppError.notFound("Caja no encontrada en esta empresa");
    }

    const abierta = await this.cajaDiariaRepository.buscarAbiertaPorCaja(caja.id);
    if (abierta) {
      throw new AppError(
        422,
        "Esta caja ya tiene un turno abierto — cerralo antes de abrir uno nuevo",
        "CAJA_DIARIA_YA_ABIERTA",
      );
    }

    return this.cajaDiariaRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cajaId: caja.id,
      fechaApertura: input.fecha,
      saldoApertura: caja.saldo,
    });
  }
}
