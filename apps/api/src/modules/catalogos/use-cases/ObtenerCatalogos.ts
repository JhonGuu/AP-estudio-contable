import { inject, injectable } from "inversify";
import { CatalogoRepository } from "../infra/CatalogoRepository.js";
import type { Catalogos } from "../domain/Catalogo.js";

/** GET /catalogos. */
@injectable()
export class ObtenerCatalogos {
  constructor(@inject(CatalogoRepository) private readonly catalogoRepository: CatalogoRepository) {}

  async ejecutar(): Promise<Catalogos> {
    return this.catalogoRepository.obtenerTodos();
  }
}
