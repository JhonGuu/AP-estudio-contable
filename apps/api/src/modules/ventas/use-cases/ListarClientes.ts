import { inject, injectable } from "inversify";
import { ClienteRepository } from "../infra/ClienteRepository.js";
import type { Cliente } from "../domain/Cliente.js";

/** GET /clientes (nota 08, seccion 5). */
@injectable()
export class ListarClientes {
  constructor(@inject(ClienteRepository) private readonly clienteRepository: ClienteRepository) {}

  async ejecutar(empresaId: string): Promise<Cliente[]> {
    return this.clienteRepository.listarPorEmpresa(empresaId);
  }
}
