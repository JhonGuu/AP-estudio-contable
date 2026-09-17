import { injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { EmpresaRepository } from "../infra/EmpresaRepository.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import { UsuarioEmpresaRepository } from "../infra/UsuarioEmpresaRepository.js";
import { ROLES_CON_ALTA_EMPRESA } from "../domain/roles.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import type { RolEmpresa } from "../domain/roles.js";

/**
 * POST /usuarios/:id/empresas — nota 06, seccion 4: "Asigna a un usuario
 * acceso a una empresa, con un rol". Valida que la empresa pertenezca al
 * mismo tenant del que hace la asignacion (mismo criterio de doble chequeo
 * que empresaContextMiddleware).
 */
@injectable()
export class AsignarUsuarioEmpresa {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly usuarioEmpresaRepository: UsuarioEmpresaRepository,
  ) {}

  async ejecutar(
    auth: AuthContext,
    usuarioIdDestino: string,
    empresaId: string,
    rol: RolEmpresa,
  ): Promise<void> {
    if (!ROLES_CON_ALTA_EMPRESA.includes(auth.rolGlobal)) {
      throw AppError.forbidden("Solo OWNER/ADMIN pueden asignar accesos a empresas");
    }

    const usuarioDestino = await this.usuarioRepository.buscarPorId(usuarioIdDestino);
    if (!usuarioDestino || usuarioDestino.tenantId !== auth.tenantId) {
      throw AppError.notFound("Usuario no encontrado en este tenant");
    }

    const empresa = await this.empresaRepository.buscarPorIdYTenant(empresaId, auth.tenantId);
    if (!empresa) {
      throw AppError.notFound("Empresa no encontrada en este tenant");
    }

    await this.usuarioEmpresaRepository.asignar(usuarioIdDestino, empresaId, rol);
  }
}
