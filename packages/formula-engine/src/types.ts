/**
 * Tipos compartidos del motor de formulas (packages/formula-engine).
 *
 * Este motor es deliberadamente chico y cerrado: NO es un lenguaje de scripting
 * general (nada de eval(), nada de loops, nada de asignacion de variables). Las
 * formulas las va a poder editar un contador desde la UI (nota 07), asi que el
 * lenguaje tiene que evaluarse en un sandbox que no pueda ejecutar codigo arbitrario.
 *
 * Gramatica (ver nota 07 "Diseno detallado - Motor de reglas de asiento"):
 *
 *   expresion   := comparacion
 *   comparacion := suma (('=' | '!=' | '>' | '<' | '>=' | '<=') suma)?
 *   suma        := termino (('+' | '-') termino)*
 *   termino     := factor (('*' | '/') factor)*
 *   factor      := numero | identificador | llamada | '(' expresion ')' | concepto | '-' factor
 *   llamada     := identificador '(' argumentos? ')'
 *   argumentos  := expresion (',' expresion)*
 *   concepto    := '#' numero        // azucar sintactica de CONCEPTO(numero) (dominio sueldos)
 *
 * El mismo AST/parser/evaluador se reutiliza en dos dominios (nota 24):
 *   - contabilidad: registro de funciones {IF, IMPUESTOS, ENTRADA}, contexto = comprobante
 *   - sueldos: registro de funciones {IF, TOPE, MNI_MIN, ACUMULADO_GANANCIA, CONCEPTO, ...},
 *     contexto = empleado + periodo + parametros vigentes
 * Cada dominio aporta su propio FunctionRegistry y su propio EvaluationContext; el
 * parser y el evaluador no conocen ningun nombre de funcion ni de variable especifico.
 */

export type FormulaValue = number | boolean;

export type ComparisonOperator = "=" | "!=" | ">" | "<" | ">=" | "<=";
export type AdditiveOperator = "+" | "-";
export type MultiplicativeOperator = "*" | "/";

export type FormulaAstNode =
  | NumberLiteralNode
  | IdentifierNode
  | UnaryMinusNode
  | BinaryOpNode
  | ComparisonNode
  | FunctionCallNode;

export interface NumberLiteralNode {
  type: "NumberLiteral";
  value: number;
}

export interface IdentifierNode {
  type: "Identifier";
  name: string;
}

export interface UnaryMinusNode {
  type: "UnaryMinus";
  argument: FormulaAstNode;
}

export interface BinaryOpNode {
  type: "BinaryOp";
  operator: AdditiveOperator | MultiplicativeOperator;
  left: FormulaAstNode;
  right: FormulaAstNode;
}

export interface ComparisonNode {
  type: "Comparison";
  operator: ComparisonOperator;
  left: FormulaAstNode;
  right: FormulaAstNode;
}

export interface FunctionCallNode {
  type: "FunctionCall";
  name: string;
  args: FormulaAstNode[];
}

/**
 * Una funcion registrada recibe los argumentos ya evaluados y el contexto activo,
 * y devuelve un FormulaValue. Nunca recibe el AST crudo: no puede evaluar codigo
 * arbitrario, solo operar sobre valores ya resueltos (esto es lo que mantiene el
 * sandbox cerrado).
 */
export type FormulaFunction<TContext extends EvaluationContext = EvaluationContext> = (
  args: FormulaValue[],
  context: TContext,
) => FormulaValue;

export type FunctionRegistry<TContext extends EvaluationContext = EvaluationContext> = Record<
  string,
  FormulaFunction<TContext>
>;

/**
 * Contexto de evaluacion: variables disponibles por nombre (ej. NETO_TOTAL, SUELDO_BRUTO).
 * La azucar sintactica '#numero' se traduce en el parser a CONCEPTO(numero) (nota 07),
 * asi que se resuelve como cualquier otra funcion registrada — el dominio sueldos
 * registra 'CONCEPTO' en su FunctionRegistry, no hace falta un metodo aparte aqui.
 * Cada dominio implementa su propio contexto (ContextoEvaluacion en contabilidad,
 * ContextoEvaluacionSueldos en sueldos).
 */
export interface EvaluationContext {
  getVariable(name: string): FormulaValue;
}
