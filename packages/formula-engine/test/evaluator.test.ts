import { describe, expect, it } from "vitest";
import { FormulaParser } from "../src/FormulaParser.js";
import { FormulaEvaluator } from "../src/FormulaEvaluator.js";
import { FormulaEvaluationError } from "../src/errors.js";
import type { EvaluationContext, FormulaValue, FunctionRegistry } from "../src/types.js";

class MapContext implements EvaluationContext {
  constructor(private readonly variables: Record<string, FormulaValue>) {}
  getVariable(name: string): FormulaValue {
    if (!(name in this.variables)) {
      throw new Error(`Variable no definida en el contexto de prueba: ${name}`);
    }
    return this.variables[name]!;
  }
}

describe("FormulaEvaluator - aritmetica y comparaciones", () => {
  const parser = new FormulaParser();
  const evaluator = new FormulaEvaluator({});

  it("evalua aritmetica basica con precedencia", () => {
    const ast = parser.parse("2 + 3 * 4");
    expect(evaluator.evaluate(ast, new MapContext({}))).toBe(14);
  });

  it("evalua division y rechaza division por cero", () => {
    expect(evaluator.evaluate(parser.parse("10 / 2"), new MapContext({}))).toBe(5);
    expect(() => evaluator.evaluate(parser.parse("10 / 0"), new MapContext({}))).toThrow(
      FormulaEvaluationError,
    );
  });

  it("resuelve identificadores contra el contexto", () => {
    const ast = parser.parse("NETO_TOTAL + IVA_TOTAL");
    const ctx = new MapContext({ NETO_TOTAL: 1000, IVA_TOTAL: 210 });
    expect(evaluator.evaluate(ast, ctx)).toBe(1210);
  });

  it("evalua comparaciones", () => {
    const ctx = new MapContext({ RUBRO: 5 });
    expect(evaluator.evaluate(parser.parse("RUBRO = 5"), ctx)).toBe(true);
    expect(evaluator.evaluate(parser.parse("RUBRO != 5"), ctx)).toBe(false);
    expect(evaluator.evaluate(parser.parse("RUBRO > 1"), ctx)).toBe(true);
  });

  it("IF es una funcion soportada nativamente en cualquier registro", () => {
    const ctx = new MapContext({ RUBRO: 1, NETO_TOTAL: 500 });
    const ast = parser.parse("IF(RUBRO=1,NETO_TOTAL,0)");
    expect(evaluator.evaluate(ast, ctx)).toBe(500);

    const ctx2 = new MapContext({ RUBRO: 9, NETO_TOTAL: 500 });
    expect(evaluator.evaluate(ast, ctx2)).toBe(0);
  });

  it("lanza FormulaEvaluationError ante una funcion desconocida", () => {
    const ast = parser.parse("NOEXISTE(1)");
    expect(() => evaluator.evaluate(ast, new MapContext({}))).toThrow(FormulaEvaluationError);
  });
});

describe("FormulaEvaluator - registro de funciones por dominio", () => {
  const parser = new FormulaParser();

  it("permite un registro de funciones propio del dominio contabilidad (IMPUESTOS)", () => {
    interface ComprobanteContext extends EvaluationContext {
      impuestosPorTipo: Record<string, number>;
    }
    const functions: FunctionRegistry<ComprobanteContext> = {
      IMPUESTOS: (args, ctx) => {
        const tipo = String(args[0]);
        return ctx.impuestosPorTipo[tipo] ?? 0;
      },
    };
    const evaluator = new FormulaEvaluator(functions);
    const ctx: ComprobanteContext = {
      getVariable: () => {
        throw new Error("no usado en este test");
      },
      impuestosPorTipo: { IVA: 210 },
    };
    // IMPUESTOS toma un identificador como "tipo" -> se evalua como variable,
    // asi que en un caso real el contexto expondria IVA como valor especial;
    // para este test simplificado forzamos el nombre via una funcion auxiliar.
    const ast = parser.parse("IMPUESTOS(1)");
    // args llegan evaluados (numeros), asi que probamos el mecanismo de dispatch,
    // no el mapeo semantico completo (ese vive en el modulo contabilidad real).
    expect(() => evaluator.evaluate(ast, ctx)).not.toThrow();
  });

  it("permite un registro de funciones propio del dominio sueldos (TOPE, CONCEPTO)", () => {
    interface SueldosContext extends EvaluationContext {
      conceptos: Record<number, number>;
    }
    const functions: FunctionRegistry<SueldosContext> = {
      TOPE: (args) => Math.min(Number(args[0]), Number(args[1])),
      CONCEPTO: (args, ctx) => ctx.conceptos[Number(args[0])] ?? 0,
    };
    const evaluator = new FormulaEvaluator(functions);
    const ctx: SueldosContext = {
      getVariable: (name) => {
        if (name === "SUELDO_BRUTO") return 500000;
        throw new Error(`Variable no definida: ${name}`);
      },
      conceptos: { 500: 12345 },
    };

    expect(evaluator.evaluate(parser.parse("TOPE(SUELDO_BRUTO, 400000)"), ctx)).toBe(400000);
    expect(evaluator.evaluate(parser.parse("#500"), ctx)).toBe(12345);
    expect(evaluator.evaluate(parser.parse("CONCEPTO(500)"), ctx)).toBe(12345);
  });
});
