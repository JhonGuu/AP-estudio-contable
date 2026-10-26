import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ChequeRepository } from "../infra/ChequeRepository.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import { puedeTransicionar, type Cheque } from "../domain/Cheque.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

/**
 * POST /tesoreria/cheques/:id/rechazar (nota 22, seccion 6). Si el cheque
 * ya estaba DEPOSITADO, revierte el saldo que se le había acreditado a la
 * cuenta bancaria. Limitacion v1 conocida (no silenciosa, documentada aca):
 * no genera un asiento de reversion — el ajuste de saldo queda hecho, pero
 * el asiento original de DEPOSITO no se contrasienta automaticamente. Igual
 * criterio que TARJETA/CHEQUE_PROPIO sin cuenta de fabrica en compras/ventas.
 */
@injectable()
export class RechazarCheque {
  constructor(
    @inject(ChequeRepository) private readonly chequeRepository: ChequeRepository,
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, chequeId: string): Promise<Cheque> {
    const cheque = await this.chequeRepository.buscarPorIdYEmpresa(chequeId, context.empresaId);
    if (!cheque) {
      throw AppError.notFound("Cheque no encontrado en esta empresa");
    }
    if (!puedeTransicionar(cheque.estado, "RECHAZADO")) {
      throw new AppError(422, `El cheque en estado ${cheque.estado} no se puede rechazar`, "CHEQUE_NO_RECHAZABLE");
    }

    if (cheque.estado === "DEPOSITADO" && cheque.cuentaBancariaId) {
      await this.cuentaBancariaRepository.ajustarSaldo(cheque.cuentaBancariaId, -cheque.importe);
    }

    return this.chequeRepository.actualizarEstado(cheque.id, "RECHAZADO");
  }
}
