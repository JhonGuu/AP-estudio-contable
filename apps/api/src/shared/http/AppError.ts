/**
 * Error de aplicacion con codigo HTTP explicito. Los use-cases y middlewares
 * lanzan esto (nunca un Error generico) para que errorHandler sepa que status
 * devolver sin tener que inspeccionar mensajes.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(400, message, code);
  }

  static unauthorized(message = "No autenticado"): AppError {
    return new AppError(401, message, "UNAUTHORIZED");
  }

  /**
   * 403 explicito y nunca un 404 silencioso — nota 06, seccion 3, punto 3:
   * "nunca un 404 silencioso que filtre existencia de datos de otro tenant".
   */
  static forbidden(message = "No autorizado"): AppError {
    return new AppError(403, message, "FORBIDDEN");
  }

  static notFound(message = "No encontrado"): AppError {
    return new AppError(404, message, "NOT_FOUND");
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(409, message, code);
  }
}
