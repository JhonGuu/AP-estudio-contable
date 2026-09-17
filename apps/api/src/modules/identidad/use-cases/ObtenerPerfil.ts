import { injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import { UsuarioEmpresaRepository } from "../infra/UsuarioEmpresaRepository.js";
import { toUsuarioPublico, type UsuarioPublico } from "../domain/Usuario.js";

export interface PerfilEmpresa {
  empresaId: string;
  rol: string;
}

export interface PerfilResult {
  usuario: UsuarioPublico;
  empresas: PerfilEmpresa[];
}

/**
 * GET /me — nota 06, seccion 4: perfil + lista de empresas a las que tiene
 * acceso, para el selector de empresa activa del frontend (nota 06, seccion 5).
 */
@injectable()
export class ObtenerPerfil {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly usuarioEmpresaRepository: UsuarioEmpresaRepository,
  ) {}

  async ejecutar(usuarioId: string): Promise<PerfilResult> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw AppError.notFound("Usuario no encontrado");
    }
    const accesos = await this.usuarioEmpresaRepository.listarEmpresasDeUsuario(usuarioId);
    return {
      usuario: toUsuarioPublico(usuario),
      empresas: accesos.map((a) => ({ empresaId: a.empresaId, rol: a.rol })),
    };
  }
}
