import { inject, injectable } from "inversify";
import { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";
import type { EstadoLibroSocietario, LibroSocietario, TipoLibroSocietario } from "../domain/LibroSocietario.js";

export interface FiltrosListarLibrosSocietarios {
  empresaId?: string;
  tipo?: TipoLibroSocietario;
  estado?: EstadoLibroSocietario;
}

/** GET /estudio/libros-societarios?empresaId=&tipo=&estado= — siempre a nivel tenant. */
@injectable()
export class ListarLibrosSocietarios {
  constructor(@inject(LibroSocietarioRepository) private readonly libroRepository: LibroSocietarioRepository) {}

  async ejecutar(tenantId: string, filtros: FiltrosListarLibrosSocietarios): Promise<LibroSocietario[]> {
    return this.libroRepository.listarPorTenant(tenantId, filtros);
  }
}
