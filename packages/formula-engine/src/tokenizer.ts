import { FormulaSyntaxError } from "./errors.js";

export type TokenType =
  | "NUMBER"
  | "IDENTIFIER"
  | "HASH_NUMBER" // '#500' -> azucar de CONCEPTO(500)
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EQ"
  | "NEQ"
  | "GTE"
  | "LTE"
  | "GT"
  | "LT"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "+": "PLUS",
  "-": "MINUS",
  "*": "STAR",
  "/": "SLASH",
  "(": "LPAREN",
  ")": "RPAREN",
  ",": "COMMA",
};

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * Tokenizer manual, sin dependencias, para el lenguaje de formulas de nota 07.
 * Deliberadamente simple: numeros, identificadores, '#numero', operadores
 * aritmeticos, comparadores y parentesis/coma. Nada mas es un token valido.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i]!;

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (ch === "=") {
      tokens.push({ type: "EQ", value: "=", position: i });
      i++;
      continue;
    }

    if (ch === "!" && source[i + 1] === "=") {
      tokens.push({ type: "NEQ", value: "!=", position: i });
      i += 2;
      continue;
    }

    if (ch === ">" && source[i + 1] === "=") {
      tokens.push({ type: "GTE", value: ">=", position: i });
      i += 2;
      continue;
    }

    if (ch === "<" && source[i + 1] === "=") {
      tokens.push({ type: "LTE", value: "<=", position: i });
      i += 2;
      continue;
    }

    if (ch === ">") {
      tokens.push({ type: "GT", value: ">", position: i });
      i++;
      continue;
    }

    if (ch === "<") {
      tokens.push({ type: "LT", value: "<", position: i });
      i++;
      continue;
    }

    if (ch in SINGLE_CHAR_TOKENS) {
      tokens.push({ type: SINGLE_CHAR_TOKENS[ch]!, value: ch, position: i });
      i++;
      continue;
    }

    if (ch === "#") {
      const start = i;
      i++;
      const digitsStart = i;
      while (i < len && isDigit(source[i]!)) i++;
      if (i === digitsStart) {
        throw new FormulaSyntaxError(`Se esperaba un numero despues de '#'`, start);
      }
      tokens.push({ type: "HASH_NUMBER", value: source.slice(digitsStart, i), position: start });
      continue;
    }

    if (isDigit(ch) || (ch === "." && isDigit(source[i + 1] ?? ""))) {
      const start = i;
      while (i < len && isDigit(source[i]!)) i++;
      if (source[i] === ".") {
        i++;
        while (i < len && isDigit(source[i]!)) i++;
      }
      tokens.push({ type: "NUMBER", value: source.slice(start, i), position: start });
      continue;
    }

    if (isIdentifierStart(ch)) {
      const start = i;
      while (i < len && isIdentifierPart(source[i]!)) i++;
      tokens.push({ type: "IDENTIFIER", value: source.slice(start, i), position: start });
      continue;
    }

    throw new FormulaSyntaxError(`Caracter inesperado '${ch}'`, i);
  }

  tokens.push({ type: "EOF", value: "", position: len });
  return tokens;
}
