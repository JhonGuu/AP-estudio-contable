import { injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { signAccessToken, verifyRefreshToken } from "../../../shared/security/jwt.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";

export interface RefrescarTokenResult {
  accessToken: string;
}

/** POST /auth/refresh — nota 06, seccion 4. */
@injectable()
export class RefrescarToken {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async ejecutar(refreshToken: string): Promise<RefrescarTokenResult> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Refresh token invalido o expirado");
    }

    const usuario = await this.usuarioRepository.buscarPorId(payload.sub);
    if (!usuario || usuario.estado !== "ACTIVO") {
      throw AppError.unauthorized("Usuario no valido");
    }

    const accessToken = signAccessToken({
      sub: usuario.id,
      tenantId: usuario.tenantId,
      rolGlobal: usuario.rolGlobal,
    });
    return { accessToken };
  }
}
