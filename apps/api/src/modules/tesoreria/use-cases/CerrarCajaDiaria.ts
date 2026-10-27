import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { CajaRepository } from "../infra/CajaRepository.js";
import { CajaDiariaRepository } from "../infra/CajaDiariaRepository.js";
import { RegistrarMovimientoFondo } from "./RegistrarMovimientoFondo.js";
import type { CajaDiaria } from "../domain/CajaDiaria.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface CerrarCajaDiariaInput {
  cajaDiariaId: string;
  fecha: Date;
  totalContado: number;
}

const EPSILON = 0.005;

/**
 * POST /tesoreria/caja-diaria/:id/cerrar (nota 22, seccion 6). Cierra un
 * turno comparando el arqueo (`totalContado`, el conteo fisico) contra el
 * saldo teorico — el saldo que la caja tiene en este momento, ya que se
 * mantiene actualizado en tiempo real por cada movimiento aplicado, no hace
 * falta reconstruirlo sumando los movimientos del turno uno por uno.
 *
 * Si hay diferencia, se reutiliza el mismo circuito de AJUSTE que
 * RegistrarMovimientoFondo ya tiene (con la contrapartida de fabrica
 * "Diferencias de caja y valores", fix de 2026-10-27): sobra plata → se
 * acredita la caja por el sobrante; falta plata → se debita por el
 * faltante. Asi el saldo de la caja termina exactamente en `totalContado`,
 * y el ajuste queda contabilizado como un asiento balanceado mas, no como
 * un numero suelto en la tabla de caja_diaria.
 */
@injectable()
export class CerrarCajaDiaria {
  constructor(
    @inject(CajaRepository) private readonly cajaRepository: CajaRepository,
    @inject(CajaDiariaRepository) private readonly cajaDiariaRepository: CajaDiariaRepository,
    @inject(RegistrarMovimientoFondo) private readonly registrarMovimientoFondo: RegistrarMovimientoFondo,
  ) {}

  async ejecutar(context: EmpresaContext, input: CerrarCajaDiariaInput): Promise<CajaDiaria> {
    if (input.totalContado < 0) {
      throw AppError.badRequest("El total contado no puede ser negativo", "TOTAL_CONTADO_INVALIDO");
    }

    const cajaDiaria = await this.cajaDiariaRepository.buscarPorIdYEmpresa(input.cajaDiariaId, context.empresaId);
    if (!cajaDiaria) {
      throw AppError.notFound("Turno de caja diaria no encontrado en esta empresa");
    }
    if (cajaDiaria.estado !== "ABIERTA") {
      throw new AppError(422, "Este turno ya esta cerrado", "CAJA_DIARIA_YA_CERRADA");
    }

    const caja = await this.cajaRepository.buscarPorIdYEmpresa(cajaDiaria.cajaId, context.empresaId);
    if (!caja) {
      throw AppError.notFound("Caja no encontrada en esta empresa");
    }

    const saldoTeorico = caja.saldo;
    const diferencia = Math.round((input.totalContado - saldoTeorico) * 100) / 100;

    let movimientoFondoId: string | null = null;
    if (Math.abs(diferencia) > EPSILON) {
      const sobra = diferencia > 0;
      const movimiento = await this.registrarMovimientoFondo.ejecutar(context, {
        tipo: "AJUSTE",
        fecha: input.fecha,
        cuentaOrigenTipo: sobra ? null : "CAJA",
        cuentaOrigenId: sobra ? null : caja.id,
        cuentaDestinoTipo: sobra ? "CAJA" : null,
        cuentaDestinoId: sobra ? caja.id : null,
        importe: Math.abs(diferencia),
        descripcion: `Ajuste por arqueo de caja "${caja.nombre}" (cierre de turno)`,
      });
      movimientoFondoId = movimiento.id;
    }

    return this.cajaDiariaRepository.cerrar(cajaDiaria.id, {
      fechaCierre: input.fecha,
      saldoTeorico,
      totalContado: input.totalContado,
      diferencia,
      movimientoFondoId,
    });
  }
}
