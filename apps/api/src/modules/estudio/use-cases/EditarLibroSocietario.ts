import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";
import type { EstadoLibroSocietario, LibroSocietario } from "../domain/LibroSocietario.js";

export interface EditarLibroSocietarioInput {
  estado?: EstadoLibroSocietario;
  ultimoFolioUtilizado?: number | null;
  fechaRubrica?: Date | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

/**
 * POST /estudio/libros-societarios/:id. A diferencia de
 * MarcarEstadoVencimiento (que solo cambia un toggle de 2 estados), un libro
 * societario tiene varios campos que cambian de forma independiente con el
 * tiempo (ubicacion, folio utilizado, estado) — se edita todo junto en un
 * solo endpoint en vez de una ruta por campo, sin reglas de transicion entre
 * estados (se puede volver de COMPLETO/EXTRAVIADO a EN_USO si se corrigio a
 * mano, ej. se encontro el libro que se habia marcado extraviado).
 */
@injectable()
export class EditarLibroSocietario {
  constructor(@inject(LibroSocietarioRepository) private readonly libroRepository: LibroSocietarioRepository) {}

  async ejecutar(
    context: AuthContext,
    libroId: string,
    input: EditarLibroSocietarioInput,
  ): Promise<LibroSocietario> {
    const libro = await this.libroRepository.buscarPorIdYTenant(libroId, context.tenantId);
    if (!libro) throw AppError.notFound("Libro societario no encontrado en este estudio");

    return this.libroRepository.editar(libroId, input);
  }
}
