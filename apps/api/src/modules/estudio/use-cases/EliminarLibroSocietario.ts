import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";

/** DELETE /estudio/libros-societarios/:id — para corregir un alta por error. */
@injectable()
export class EliminarLibroSocietario {
  constructor(@inject(LibroSocietarioRepository) private readonly libroRepository: LibroSocietarioRepository) {}

  async ejecutar(context: AuthContext, libroId: string): Promise<void> {
    const libro = await this.libroRepository.buscarPorIdYTenant(libroId, context.tenantId);
    if (!libro) throw AppError.notFound("Libro societario no encontrado en este estudio");

    await this.libroRepository.eliminar(libroId);
  }
}
