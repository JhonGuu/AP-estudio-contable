import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ChequeRepository } from "../infra/ChequeRepository.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { GenerarAsientoDesdeComprobante } from "../../contabilidad/use-cases/GenerarAsientoDesdeComprobante.js";
import { puedeDepositarse, type Cheque } from "../domain/Cheque.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export interface DepositarChequeInput {
  chequeId: string;
  cuentaBancariaId: string;
  fecha: Date;
}

/**
 * POST /tesoreria/cheques/:id/depositar (nota 22, seccion 4: solo cheques
 * RECIBIDO). El asiento usa cuentas genericas de fabrica (mismo criterio que
 * PAGO_ASIENTO/COBRO_ASIENTO: "Cuentas bancarias" 1.1.01.002 y "Cheques de
 * terceros en cartera" 1.1.01.003 son cuentas pool, no una por cada
 * cuenta_bancaria especifica) — evento DEPOSITO, ya listado en
 * EVENTOS_MODELO_ASIENTO pero sin plantilla hasta que se siembra (ver
 * ActivarModelosAsientoDeFabrica). El saldo de la cuenta se actualiza al
 * depositar, no al acreditarse (simplificacion v1 — no hay cuenta "valores
 * al cobro" transitoria todavia).
 */
@injectable()
export class DepositarCheque {
  constructor(
    @inject(ChequeRepository) private readonly chequeRepository: ChequeRepository,
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(GenerarAsientoDesdeComprobante) private readonly generarAsientoDesdeComprobante: GenerarAsientoDesdeComprobante,
  ) {}

  async ejecutar(context: EmpresaContext, input: DepositarChequeInput): Promise<Cheque> {
    const cheque = await this.chequeRepository.buscarPorIdYEmpresa(input.chequeId, context.empresaId);
    if (!cheque) {
      throw AppError.notFound("Cheque no encontrado en esta empresa");
    }
    if (!puedeDepositarse(cheque)) {
      throw new AppError(
        422,
        `El cheque en estado ${cheque.estado} (origen ${cheque.origen}) no se puede depositar`,
        "CHEQUE_NO_DEPOSITABLE",
      );
    }

    const cuentaBancaria = await this.cuentaBancariaRepository.buscarPorIdYEmpresa(
      input.cuentaBancariaId,
      context.empresaId,
    );
    if (!cuentaBancaria) {
      throw AppError.notFound("Cuenta bancaria no encontrada en esta empresa");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) {
      throw AppError.notFound("Empresa no encontrada");
    }

    const actualizado = await this.chequeRepository.actualizarEstado(cheque.id, "DEPOSITADO", cuentaBancaria.id);
    await this.cuentaBancariaRepository.ajustarSaldo(cuentaBancaria.id, cheque.importe);

    await this.generarAsientoDesdeComprobante.ejecutar({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      cierreEjercicioMMDD: empresa.cierreEjercicio,
      evento: "DEPOSITO",
      fecha: input.fecha,
      leyenda: `Deposito de cheque de tercero N° ${cheque.numero}`,
      comprobanteOrigen: { tipo: "cheque", id: cheque.id },
      variables: { DEPOSITO_TOTAL: cheque.importe },
    });

    return actualizado;
  }
}
