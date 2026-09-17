import { describe, expect, it } from "vitest";
import { FormulaParser } from "../src/FormulaParser.js";
import { FormulaSyntaxError } from "../src/errors.js";

describe("FormulaParser", () => {
  const parser = new FormulaParser();

  it("parsea literales numericos", () => {
    expect(parser.parse("42")).toEqual({ type: "NumberLiteral", value: 42 });
  });

  it("respeta precedencia de * sobre +", () => {
    const ast = parser.parse("2 + 3 * 4");
    expect(ast).toEqual({
      type: "BinaryOp",
      operator: "+",
      left: { type: "NumberLiteral", value: 2 },
      right: {
        type: "BinaryOp",
        operator: "*",
        left: { type: "NumberLiteral", value: 3 },
        right: { type: "NumberLiteral", value: 4 },
      },
    });
  });

  it("parsea parentesis explicitos", () => {
    const ast = parser.parse("(2 + 3) * 4");
    expect(ast).toEqual({
      type: "BinaryOp",
      operator: "*",
      left: {
        type: "BinaryOp",
        operator: "+",
        left: { type: "NumberLiteral", value: 2 },
        right: { type: "NumberLiteral", value: 3 },
      },
      right: { type: "NumberLiteral", value: 4 },
    });
  });

  it("parsea llamadas a funcion con multiples argumentos", () => {
    const ast = parser.parse("IF(RUBRO=1,NETO_TOTAL+IVA_TOTAL,0)");
    expect(ast.type).toBe("FunctionCall");
    if (ast.type === "FunctionCall") {
      expect(ast.name).toBe("IF");
      expect(ast.args).toHaveLength(3);
      expect(ast.args[0]!.type).toBe("Comparison");
    }
  });

  it("traduce '#500' a CONCEPTO(500)", () => {
    const ast = parser.parse("#500");
    expect(ast).toEqual({
      type: "FunctionCall",
      name: "CONCEPTO",
      args: [{ type: "NumberLiteral", value: 500 }],
    });
  });

  it("parsea el menos unario", () => {
    const ast = parser.parse("-CONCEPTO(100)");
    expect(ast.type).toBe("UnaryMinus");
  });

  it("rechaza sintaxis invalida", () => {
    expect(() => parser.parse("2 +")).toThrow(FormulaSyntaxError);
    expect(() => parser.parse("IF(1,2")).toThrow(FormulaSyntaxError);
    expect(() => parser.parse("2 $ 3")).toThrow(FormulaSyntaxError);
  });
});
