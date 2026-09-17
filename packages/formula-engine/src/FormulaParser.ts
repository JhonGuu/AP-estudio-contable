import { FormulaSyntaxError } from "./errors.js";
import { tokenize, type Token, type TokenType } from "./tokenizer.js";
import type {
  ComparisonOperator,
  FormulaAstNode,
} from "./types.js";

const COMPARISON_TOKEN_TO_OPERATOR: Partial<Record<TokenType, ComparisonOperator>> = {
  EQ: "=",
  NEQ: "!=",
  GT: ">",
  LT: "<",
  GTE: ">=",
  LTE: "<=",
};

/**
 * Parser recursivo-descendente para el lenguaje de formulas de nota 07.
 * Produce un FormulaAstNode; no evalua nada (eso es responsabilidad de
 * FormulaEvaluator). Separar parseo de evaluacion permite, por ejemplo,
 * validar sintacticamente una formula en la UI sin tener un contexto real.
 */
export class FormulaParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(source: string): FormulaAstNode {
    this.tokens = tokenize(source);
    this.pos = 0;
    const node = this.parseExpresion();
    this.expect("EOF");
    return node;
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    const token = this.tokens[this.pos]!;
    if (token.type !== "EOF") this.pos++;
    return token;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new FormulaSyntaxError(
        `Se esperaba '${type}' pero se encontro '${token.type}' ('${token.value}')`,
        token.position,
      );
    }
    return this.advance();
  }

  // expresion := comparacion
  private parseExpresion(): FormulaAstNode {
    return this.parseComparacion();
  }

  // comparacion := suma (('=' | '!=' | '>' | '<' | '>=' | '<=') suma)?
  private parseComparacion(): FormulaAstNode {
    const left = this.parseSuma();
    const operator = COMPARISON_TOKEN_TO_OPERATOR[this.peek().type];
    if (!operator) return left;
    this.advance();
    const right = this.parseSuma();
    return { type: "Comparison", operator, left, right };
  }

  // suma := termino (('+' | '-') termino)*
  private parseSuma(): FormulaAstNode {
    let node = this.parseTermino();
    while (this.check("PLUS") || this.check("MINUS")) {
      const opToken = this.advance();
      const right = this.parseTermino();
      node = { type: "BinaryOp", operator: opToken.type === "PLUS" ? "+" : "-", left: node, right };
    }
    return node;
  }

  // termino := factor (('*' | '/') factor)*
  private parseTermino(): FormulaAstNode {
    let node = this.parseFactor();
    while (this.check("STAR") || this.check("SLASH")) {
      const opToken = this.advance();
      const right = this.parseFactor();
      node = { type: "BinaryOp", operator: opToken.type === "STAR" ? "*" : "/", left: node, right };
    }
    return node;
  }

  // factor := numero | identificador | llamada | '(' expresion ')' | concepto | '-' factor
  private parseFactor(): FormulaAstNode {
    const token = this.peek();

    if (token.type === "MINUS") {
      this.advance();
      return { type: "UnaryMinus", argument: this.parseFactor() };
    }

    if (token.type === "NUMBER") {
      this.advance();
      return { type: "NumberLiteral", value: Number.parseFloat(token.value) };
    }

    if (token.type === "HASH_NUMBER") {
      this.advance();
      return { type: "FunctionCall", name: "CONCEPTO", args: [{ type: "NumberLiteral", value: Number.parseFloat(token.value) }] };
    }

    if (token.type === "LPAREN") {
      this.advance();
      const node = this.parseExpresion();
      this.expect("RPAREN");
      return node;
    }

    if (token.type === "IDENTIFIER") {
      this.advance();
      if (this.check("LPAREN")) {
        return this.parseFunctionCallArgs(token.value);
      }
      return { type: "Identifier", name: token.value };
    }

    throw new FormulaSyntaxError(
      `Token inesperado '${token.type}' ('${token.value}')`,
      token.position,
    );
  }

  // llamada := identificador '(' argumentos? ')'
  private parseFunctionCallArgs(name: string): FormulaAstNode {
    this.expect("LPAREN");
    const args: FormulaAstNode[] = [];
    if (!this.check("RPAREN")) {
      args.push(this.parseExpresion());
      while (this.check("COMMA")) {
        this.advance();
        args.push(this.parseExpresion());
      }
    }
    this.expect("RPAREN");
    return { type: "FunctionCall", name, args };
  }
}
