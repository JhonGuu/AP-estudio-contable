import type { EvaluationContext, FormulaValue, FunctionRegistry } from "@ap-contadores/formula-engine";

/**
 * IMPUESTOS(codigo) — nota 21: el lenguaje de formulas no tiene literales de
 * string (solo numeros/identificadores — packages/formula-engine/src/types.ts),
 * asi que el tipo de impuesto se referencia por codigo numerico, igual que el
 * caso de prueba de packages/formula-engine/test/asiento-venta.test.ts.
 */
export const TIPOS_IMPUESTO = { IVA: 1, IIBB: 2, OTROS: 3 } as const;

/**
 * Contexto de evaluacion del dominio contable (nota 07, seccion 3): variables
 * armadas a partir de los totales del comprobante que dispara el asiento
 * (NETO_TOTAL, IVA_TOTAL, CAJA_TOTAL, etc. — nota 07 "variables de contexto
 * por tipo de evento"). RUBRO/PROYECTO tambien viajan como variables simples.
 */
export class ContextoEvaluacionContable implements EvaluationContext {
  constructor(
    private readonly variables: Record<string, number>,
    private readonly impuestosPorCodigo: Record<number, number> = {},
  ) {}

  getVariable(name: string): FormulaValue {
    if (!(name in this.variables)) {
      throw new Error(`Variable de contexto no definida: ${name}`);
    }
    return this.variables[name]!;
  }

  impuesto(codigo: number): number {
    return this.impuestosPorCodigo[codigo] ?? 0;
  }
}

/** Funciones del dominio contable registradas para el FormulaEvaluator (nota 07, seccion 3). IF ya viene resuelto por el evaluador base. */
export const FUNCIONES_CONTABLES: FunctionRegistry<ContextoEvaluacionContable> = {
  IMPUESTOS: (args, ctx) => {
    const codigo = args[0];
    if (typeof codigo !== "number") {
      throw new Error("IMPUESTOS(codigo) espera un numero (1=IVA, 2=IIBB, 3=OTROS)");
    }
    return ctx.impuesto(codigo);
  },
};
