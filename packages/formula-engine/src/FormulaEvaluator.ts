import { FormulaEvaluationError } from "./errors.js";
import type {
  EvaluationContext,
  FormulaAstNode,
  FormulaValue,
  FunctionRegistry,
} from "./types.js";

function toNumber(value: FormulaValue, position?: string): number {
  if (typeof value === "number") return value;
  throw new FormulaEvaluationError(
    `Se esperaba un numero pero se obtuvo un booleano${position ? ` en ${position}` : ""}`,
  );
}

function isTruthy(value: FormulaValue): boolean {
  return typeof value === "boolean" ? value : value !== 0;
}

/**
 * Evalua un FormulaAstNode contra un contexto y un registro de funciones dados.
 * No conoce ningun nombre de variable/funcion especifico de dominio: eso lo
 * aportan el EvaluationContext y el FunctionRegistry que recibe cada llamada
 * (contabilidad y sueldos instancian el mismo evaluador con registros distintos).
 */
export class FormulaEvaluator<TContext extends EvaluationContext = EvaluationContext> {
  constructor(private readonly functions: FunctionRegistry<TContext>) {}

  evaluate(node: FormulaAstNode, context: TContext): FormulaValue {
    switch (node.type) {
      case "NumberLiteral":
        return node.value;

      case "Identifier":
        return context.getVariable(node.name);

      case "UnaryMinus":
        return -toNumber(this.evaluate(node.argument, context));

      case "BinaryOp": {
        const left = toNumber(this.evaluate(node.left, context));
        const right = toNumber(this.evaluate(node.right, context));
        switch (node.operator) {
          case "+":
            return left + right;
          case "-":
            return left - right;
          case "*":
            return left * right;
          case "/":
            if (right === 0) {
              throw new FormulaEvaluationError("Division por cero");
            }
            return left / right;
        }
        break;
      }

      case "Comparison": {
        const left = this.evaluate(node.left, context);
        const right = this.evaluate(node.right, context);
        switch (node.operator) {
          case "=":
            return left === right;
          case "!=":
            return left !== right;
          case ">":
            return toNumber(left) > toNumber(right);
          case "<":
            return toNumber(left) < toNumber(right);
          case ">=":
            return toNumber(left) >= toNumber(right);
          case "<=":
            return toNumber(left) <= toNumber(right);
        }
        break;
      }

      case "FunctionCall": {
        if (node.name === "IF") {
          if (node.args.length !== 3) {
            throw new FormulaEvaluationError("IF requiere exactamente 3 argumentos (condicion, si, no)");
          }
          const [condNode, thenNode, elseNode] = node.args as [FormulaAstNode, FormulaAstNode, FormulaAstNode];
          const cond = this.evaluate(condNode, context);
          return isTruthy(cond) ? this.evaluate(thenNode, context) : this.evaluate(elseNode, context);
        }

        const fn = this.functions[node.name];
        if (!fn) {
          throw new FormulaEvaluationError(`Funcion desconocida: '${node.name}'`);
        }
        const args = node.args.map((arg) => this.evaluate(arg, context));
        return fn(args, context);
      }
    }

    throw new FormulaEvaluationError(`Nodo de AST no soportado: ${JSON.stringify(node)}`);
  }
}
