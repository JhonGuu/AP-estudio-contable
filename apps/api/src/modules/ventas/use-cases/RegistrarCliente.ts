import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { ClienteRepository } from "../infra/ClienteRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Cliente } from "../domain/Cliente.js";

export interface RegistrarClienteInput {
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** POST /clientes (nota 08, seccion 5). */
@injectable()
export class RegistrarCliente {
  constructor(@inject(ClienteRepository) private readonly clienteRepository: ClienteRepository) {}

  async ejecutar(context: EmpresaContext, input: RegistrarClienteInput): Promise<Cliente> {
    const existentes = await this.clienteRepository.listarPorEmpresa(context.empresaId);
    if (existentes.some((c) => c.cuit === input.cuit)) {
      throw AppError.conflict("Ya existe un cliente con ese CUIT en esta empresa", "CLIENTE_CUIT_DUPLICADO");
    }
    return this.clienteRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      condicionIvaId: input.condicionIvaId,
      domicilio: input.domicilio ?? null,
    });
  }
}
