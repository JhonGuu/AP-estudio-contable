/**
 * Errores propios del motor de formulas. Nunca se deja escapar un error nativo de
 * parseo/evaluacion sin envolver: el objetivo es que un contador editando una formula
 * desde la UI reciba un mensaje localizable, no un stack trace de JS.
 */
export class FormulaError extends Error {
  constructor(
    message: string,
    public readonly position?: number,
  ) {
    super(message);
    this.name = "FormulaError";
  }
}

export class FormulaSyntaxError extends FormulaError {
  constructor(message: string, position?: number) {
    super(message, position);
    this.name = "FormulaSyntaxError";
  }
}

export class FormulaEvaluationError extends FormulaError {
  constructor(message: string, position?: number) {
    super(message, position);
    this.name = "FormulaEvaluationError";
  }
}
