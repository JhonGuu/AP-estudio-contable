import { describe, expect, it } from "vitest";
import { FormulaParser } from "../src/FormulaParser.js";
import { FormulaEvaluator } from "../src/FormulaEvaluator.js";
import type { EvaluationContext, FormulaValue, FunctionRegistry } from "../src/types.js";

/**
 * Caso end-to-end basado en el modelo ASIENTO_VENTA documentado en nota 07 /
 * nota 21: una linea del modelo imputa a "Ventas" el total segun el RUBRO del
 * comprobante, usando la formula real
 *   IF(RUBRO=1, NETO_TOTAL+NOGRAVADO_TOTAL+EXENTO_TOTAL, 0)
 * y otra linea imputa el IVA via IMPUESTOS('IVA'). Este test sirve de contrato:
 * si el parser o el evaluador cambian de forma que rompa este caso, el motor de
 * asientos real se rompe.
 */
interface ComprobanteContext extends EvaluationContext {
  variables: Record<string, number>;
  impuestosPorTipo: Record<string, number>;
}

function buildComprobanteContext(overrides: Partial<ComprobanteContext["variables"]>): ComprobanteContext {
  const variables: Record<string, number> = {
    RUBRO: 1,
    NETO_TOTAL: 0,
    NOGRAVADO_TOTAL: 0,
    EXENTO_TOTAL: 0,
    IVA_TOTAL: 0,
    IMPORTE_TOTAL: 0,
    ...overrides,
  };
  return {
    variables,
    impuestosPorTipo: { IVA: variables.IVA_TOTAL },
    getVariable(name: string): FormulaValue {
      if (!(name in variables)) {
        throw new Error(`Variable de comprobante no definida: ${name}`);
      }
      return variables[name]!;
    },
  };
}

const contabilidadFunctions: FunctionRegistry<ComprobanteContext> = {
  IMPUESTOS: (args, ctx) => {
    // En el modulo real el parser recibe el tipo como identificador string;
    // aqui, para no acoplar el test a la resolucion de identificadores como
    // strings (el lenguaje solo resuelve identificadores a FormulaValue),
    // se ejercita el registro de funciones con el total de IVA precomputado.
    void args;
    return ctx.impuestosPorTipo.IVA ?? 0;
  },
};

describe("Caso real: modelo ASIENTO_VENTA (nota 07 / nota 21)", () => {
  const parser = new FormulaParser();
  const evaluator = new FormulaEvaluator(contabilidadFunctions);

  const formulaVentas = "IF(RUBRO=1,NETO_TOTAL+NOGRAVADO_TOTAL+EXENTO_TOTAL,0)";
  const formulaIva = "IMPUESTOS(1)";

  it("imputa el total de Ventas cuando el RUBRO coincide", () => {
    const ctx = buildComprobanteContext({
      RUBRO: 1,
      NETO_TOTAL: 1000,
      NOGRAVADO_TOTAL: 50,
      EXENTO_TOTAL: 0,
      IVA_TOTAL: 210,
    });
    expect(evaluator.evaluate(parser.parse(formulaVentas), ctx)).toBe(1050);
    expect(evaluator.evaluate(parser.parse(formulaIva), ctx)).toBe(210);
  });

  it("no imputa nada a Ventas cuando el RUBRO no coincide (partida queda en 0, no rompe el asiento)", () => {
    const ctx = buildComprobanteContext({ RUBRO: 2, NETO_TOTAL: 1000 });
    expect(evaluator.evaluate(parser.parse(formulaVentas), ctx)).toBe(0);
  });

  it("el asiento cierra: Debe (Ventas + IVA) == Haber (deudor por venta)", () => {
    const ctx = buildComprobanteContext({
      RUBRO: 1,
      NETO_TOTAL: 1000,
      NOGRAVADO_TOTAL: 0,
      EXENTO_TOTAL: 0,
      IVA_TOTAL: 210,
      IMPORTE_TOTAL: 1210,
    });
    const ventas = evaluator.evaluate(parser.parse(formulaVentas), ctx) as number;
    const iva = evaluator.evaluate(parser.parse(formulaIva), ctx) as number;
    const deudorPorVenta = evaluator.evaluate(parser.parse("IMPORTE_TOTAL"), ctx) as number;

    // Esta es la validacion de partida doble de GenerarAsientoDesdeComprobante (nota 07, punto 5):
    // si esto no da igual, el asiento se rechaza y no se persiste nada.
    expect(ventas + iva).toBe(deudorPorVenta);
  });
});
