import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { CatalogoRepository } from "../../catalogos/infra/CatalogoRepository.js";
import type { Empresa } from "../../identidad/domain/Empresa.js";

/**
 * POST /estudio/monotributo/:empresaId/categoria. `categoriaMonotributoId:
 * null` des-categoriza (ej. el cliente dejo de ser monotributista). No se
 * valida que la empresa tenga condicionIva = Monotributo: el estudio puede
 * precargar la categoria antes de actualizar la condicion de IVA, o dejarla
 * cargada por las dudas — el panel ya filtra por condicionIva al listar.
 */
@injectable()
export class ActualizarCategoriaMonotributo {
  constructor(
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(CatalogoRepository) private readonly catalogoRepository: CatalogoRepository,
  ) {}

  async ejecutar(context: AuthContext, empresaId: string, categoriaMonotributoId: string | null): Promise<Empresa> {
    const empresa = await this.empresaRepository.buscarPorIdYTenant(empresaId, context.tenantId);
    if (!empresa) throw AppError.notFound("Empresa no encontrada en este estudio");

    if (categoriaMonotributoId) {
      const catalogos = await this.catalogoRepository.obtenerTodos();
      const existe = catalogos.categoriasMonotributo.some((c) => c.id === categoriaMonotributoId);
      if (!existe) throw AppError.badRequest("Categoria de monotributo invalida", "CATEGORIA_MONOTRIBUTO_INVALIDA");
    }

    return this.empresaRepository.actualizarCategoriaMonotributo(empresaId, categoriaMonotributoId);
  }
}
