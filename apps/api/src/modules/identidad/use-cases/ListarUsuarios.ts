import { inject, injectable } from "inversify";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import { toUsuarioPublico, type UsuarioPublico } from "../domain/Usuario.js";

/**
 * GET /usuarios — personal del estudio (nota 06). Usado hoy por el modulo
 * "estudio" (gestion de tareas internas) para poblar el selector de "asignado
 * a"; antes no hacia falta listar usuarios, solo invitarlos.
 */
@injectable()
export class ListarUsuarios {
  constructor(@inject(UsuarioRepository) private readonly usuarioRepository: UsuarioRepository) {}

  async ejecutar(tenantId: string): Promise<UsuarioPublico[]> {
    const usuarios = await this.usuarioRepository.listarPorTenant(tenantId);
    return usuarios.map(toUsuarioPublico);
  }
}
