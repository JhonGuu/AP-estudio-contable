import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ProveedorRepository } from "../infra/ProveedorRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Proveedor } from "../domain/Proveedor.js";

export interface RegistrarProveedorInput {
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** POST /proveedores (nota 08, seccion 5). */
@injectable()
export class RegistrarProveedor {
  constructor(@inject(ProveedorRepository) private readonly proveedorRepository: ProveedorRepository) {}

  async ejecutar(context: EmpresaContext, input: RegistrarProveedorInput): Promise<Proveedor> {
    const existentes = await this.proveedorRepository.listarPorEmpresa(context.empresaId);
    if (existentes.some((p) => p.cuit === input.cuit)) {
      throw AppError.conflict("Ya existe un proveedor con ese CUIT en esta empresa", "PROVEEDOR_CUIT_DUPLICADO");
    }
    return this.proveedorRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      condicionIvaId: input.condicionIvaId,
      domicilio: input.domicilio ?? null,
    });
  }
}
