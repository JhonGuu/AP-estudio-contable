import { injectable } from "inversify";
import { ProveedorRepository } from "../infra/ProveedorRepository.js";
import type { Proveedor } from "../domain/Proveedor.js";

/** GET /proveedores (nota 08, seccion 5). */
@injectable()
export class ListarProveedores {
  constructor(private readonly proveedorRepository: ProveedorRepository) {}

  async ejecutar(empresaId: string): Promise<Proveedor[]> {
    return this.proveedorRepository.listarPorEmpresa(empresaId);
  }
}
