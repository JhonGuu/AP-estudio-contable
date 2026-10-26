import { inject, injectable } from "inversify";
import { FormulaEvaluator, FormulaParser } from "@ap-contadores/formula-engine";
import { AppError } from "../../../shared/http/AppError.js";
import { ModeloAsientoRepository } from "../infra/ModeloAsientoRepository.js";
import { AsientoRepository } from "../infra/AsientoRepository.js";
import { EjercicioRepository } from "../infra/EjercicioRepository.js";
import { ContextoEvaluacionContable, FUNCIONES_CONTABLES } from "../domain/ContextoEvaluacionContable.js";
import { estaBalanceado, type Asiento, type AsientoMovimientoInput, type ComprobanteOrigen } from "../domain/Asiento.js";
import type { EventoModeloAsiento } from "../domain/ModeloAsiento.js";

export interface GenerarAsientoInput {
  tenantId: string;
  empresaId: string;
  /** empresa.cierreEjercicio (nota 06) — lo pasa quien orquesta (compras/ventas). */
  cierreEjercicioMMDD: string;
  evento: EventoModeloAsiento;
  fecha: Date;
  leyenda: string;
  comprobanteOrigen: ComprobanteOrigen | null;
  variables: Record<string, number>;
  impuestosPorCodigo?: Record<number, number>;
}

/**
 * Orquesta el flujo de nota 07, seccion 5: busca el modelo_asiento activo de
 * la empresa para el evento, evalua cada movimiento con el motor de formulas,
 * valida partida doble y persiste — o rechaza sin persistir nada si no cierra.
 * Este es el puerto que llaman Compras/Ventas al confirmar un comprobante o
 * registrar un pago/cobro (nota 08, seccion 3: "no conocen el plan de cuentas
 * ni las formulas — esa separacion es la que hace reutilizable este motor").
 */
@injectable()
export class GenerarAsientoDesdeComprobante {
  constructor(
    @inject(ModeloAsientoRepository) private readonly modeloAsientoRepository: ModeloAsientoRepository,
    @inject(AsientoRepository) private readonly asientoRepository: AsientoRepository,
    @inject(EjercicioRepository) private readonly ejercicioRepository: EjercicioRepository,
  ) {}

  async ejecutar(input: GenerarAsientoInput): Promise<Asiento> {
    const modelo = await this.modeloAsientoRepository.buscarPorEvento(input.empresaId, input.evento);
    if (!modelo) {
      throw new AppError(
        422,
        `No hay un modelo de asiento configurado para el evento ${input.evento} en esta empresa`,
        "MODELO_ASIENTO_NO_CONFIGURADO",
      );
    }

    const contexto = new ContextoEvaluacionContable(input.variables, input.impuestosPorCodigo ?? {});
    const parser = new FormulaParser();
    const evaluator = new FormulaEvaluator(FUNCIONES_CONTABLES);

    const movimientos: AsientoMovimientoInput[] = modelo.movimientos.map((m) => {
      let valor: number;
      try {
        valor = evaluator.evaluate(parser.parse(m.formula), contexto) as number;
      } catch (error) {
        throw new AppError(
          422,
          `Error evaluando la formula del modelo ${input.evento} (cuenta ${m.cuentaCodigo}): ${
            error instanceof Error ? error.message : String(error)
          }`,
          "FORMULA_ASIENTO_INVALIDA",
        );
      }
      return { cuentaId: m.cuentaId, cuentaCodigo: m.cuentaCodigo, lado: m.lado, importe: valor };
    });

    if (!estaBalanceado(movimientos)) {
      const debe = movimientos.filter((m) => m.lado === "DEBE").reduce((a, m) => a + m.importe, 0);
      const haber = movimientos.filter((m) => m.lado === "HABER").reduce((a, m) => a + m.importe, 0);
      throw new AppError(
        422,
        `El asiento generado para ${input.evento} no cierra: Debe ${debe.toFixed(2)} != Haber ${haber.toFixed(2)}`,
        "ASIENTO_DESBALANCEADO",
      );
    }

    const ejercicio = await this.ejercicioRepository.obtenerOCrear(
      input.tenantId,
      input.empresaId,
      input.fecha,
      input.cierreEjercicioMMDD,
    );

    return this.asientoRepository.crear({
      tenantId: input.tenantId,
      empresaId: input.empresaId,
      ejercicioId: ejercicio.id,
      fecha: input.fecha,
      leyenda: input.leyenda,
      origen: "AUTOMATICO",
      comprobanteOrigen: input.comprobanteOrigen,
      movimientos,
    });
  }
}
