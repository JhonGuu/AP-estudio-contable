import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { MovimientoFondoRepository } from "../infra/MovimientoFondoRepository.js";
import { CajaRepository } from "../infra/CajaRepository.js";
import { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { EjercicioRepository } from "../../contabilidad/infra/EjercicioRepository.js";
import { AsientoRepository } from "../../contabilidad/infra/AsientoRepository.js";
import { PlanCuentaRepository } from "../../contabilidad/infra/PlanCuentaRepository.js";
import { movimientoEsValido, type MovimientoFondo, type NuevoMovimientoFondo } from "../domain/MovimientoFondo.js";
import type { AsientoMovimientoInput } from "../../contabilidad/domain/Asiento.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

export type RegistrarMovimientoFondoInput = NuevoMovimientoFondo;

/**
 * POST /tesoreria/movimientos-fondo (nota 22, seccion 3 y 4). A diferencia
 * de DepositarCheque, origen y destino ya son conocidos de antemano (los
 * elige quien registra la transferencia/ajuste) — no hace falta el motor de
 * formulas para decidir que cuenta debita/acredita: se arma el asiento
 * MANUAL directo, resolviendo la cuenta contable real de cada caja/cuenta
 * bancaria (no una cuenta pool de fabrica, a diferencia de PAGO_ASIENTO/
 * COBRO_ASIENTO/DEPOSITO).
 */
@injectable()
export class RegistrarMovimientoFondo {
  constructor(
    @inject(MovimientoFondoRepository) private readonly movimientoFondoRepository: MovimientoFondoRepository,
    @inject(CajaRepository) private readonly cajaRepository: CajaRepository,
    @inject(CuentaBancariaRepository) private readonly cuentaBancariaRepository: CuentaBancariaRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(EjercicioRepository) private readonly ejercicioRepository: EjercicioRepository,
    @inject(AsientoRepository) private readonly asientoRepository: AsientoRepository,
    @inject(PlanCuentaRepository) private readonly planCuentaRepository: PlanCuentaRepository,
  ) {}

  async ejecutar(context: EmpresaContext, input: RegistrarMovimientoFondoInput): Promise<MovimientoFondo> {
    if (!movimientoEsValido(input)) {
      throw AppError.badRequest(
        "Un movimiento de fondo invalido: TRANSFERENCIA necesita origen y destino, AJUSTE necesita al menos uno, y el importe debe ser positivo",
        "MOVIMIENTO_FONDO_INVALIDO",
      );
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(context.empresaId, context.tenantId);
    if (!empresa) {
      throw AppError.notFound("Empresa no encontrada");
    }

    const movimientos: AsientoMovimientoInput[] = [];

    if (input.cuentaDestinoTipo && input.cuentaDestinoId) {
      const cuenta = await this.resolverCuentaContable(context.empresaId, input.cuentaDestinoTipo, input.cuentaDestinoId);
      movimientos.push({ cuentaId: cuenta.id, cuentaCodigo: cuenta.codigo, lado: "DEBE", importe: input.importe });
      await this.ajustarSaldo(input.cuentaDestinoTipo, input.cuentaDestinoId, input.importe);
    }

    if (input.cuentaOrigenTipo && input.cuentaOrigenId) {
      const cuenta = await this.resolverCuentaContable(context.empresaId, input.cuentaOrigenTipo, input.cuentaOrigenId);
      movimientos.push({ cuentaId: cuenta.id, cuentaCodigo: cuenta.codigo, lado: "HABER", importe: input.importe });
      await this.ajustarSaldo(input.cuentaOrigenTipo, input.cuentaOrigenId, -input.importe);
    }

    const movimiento = await this.movimientoFondoRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      ...input,
    });

    const ejercicio = await this.ejercicioRepository.obtenerOCrear(
      context.tenantId,
      context.empresaId,
      input.fecha,
      empresa.cierreEjercicio,
    );

    await this.asientoRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      ejercicioId: ejercicio.id,
      fecha: input.fecha,
      leyenda: input.descripcion,
      origen: "MANUAL",
      comprobanteOrigen: { tipo: "movimiento_fondo", id: movimiento.id },
      movimientos,
    });

    return movimiento;
  }

  private async resolverCuentaContable(empresaId: string, tipo: "CAJA" | "CUENTA_BANCARIA", id: string) {
    const cuentaContableId =
      tipo === "CAJA"
        ? (await this.cajaRepository.buscarPorIdYEmpresa(id, empresaId))?.cuentaContableId
        : (await this.cuentaBancariaRepository.buscarPorIdYEmpresa(id, empresaId))?.cuentaContableId;
    if (!cuentaContableId) {
      throw AppError.notFound(`${tipo === "CAJA" ? "Caja" : "Cuenta bancaria"} no encontrada en esta empresa`);
    }
    const cuenta = await this.planCuentaRepository.buscarPorIdYEmpresa(cuentaContableId, empresaId);
    if (!cuenta) {
      throw new AppError(422, "La cuenta contable asociada ya no existe en el plan de cuentas", "CUENTA_CONTABLE_INEXISTENTE");
    }
    return cuenta;
  }

  private async ajustarSaldo(tipo: "CAJA" | "CUENTA_BANCARIA", id: string, delta: number): Promise<void> {
    if (tipo === "CAJA") {
      await this.cajaRepository.ajustarSaldo(id, delta);
    } else {
      await this.cuentaBancariaRepository.ajustarSaldo(id, delta);
    }
  }
}
