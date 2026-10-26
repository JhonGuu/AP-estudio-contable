import { inject, injectable } from "inversify";
import { EmpresaRepository } from "../infra/EmpresaRepository.js";
import type { Empresa } from "../domain/Empresa.js";

/** GET /empresas — nota 06, seccion 4: "Lista las empresas del tenant". */
@injectable()
export class ListarEmpresas {
  constructor(@inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository) {}

  async ejecutar(tenantId: string): Promise<Empresa[]> {
    return this.empresaRepository.listarPorTenant(tenantId);
  }
}
