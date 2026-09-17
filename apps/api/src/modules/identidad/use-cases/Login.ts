import { injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { verifyPassword } from "../../../shared/security/password.js";
import { signAccessToken, signRefreshToken } from "../../../shared/security/jwt.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import { toUsuarioPublico, type UsuarioPublico } from "../domain/Usuario.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioPublico;
}

/**
 * POST /auth/login — nota 06, seccion 3, punto 1. El JWT de acceso lleva
 * { sub: usuarioId, tenantId, rolGlobal } y nunca empresaId (la empresa activa
 * se elige despues via X-Empresa-Id, sin volver a loguearse).
 */
@injectable()
export class Login {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async ejecutar(input: LoginInput): Promise<LoginResult> {
    const usuario = await this.usuarioRepository.buscarPorEmail(input.email);
    // Mensaje identico exista o no el email: no revelar cuentas registradas.
    if (!usuario) {
      throw AppError.unauthorized("Email o contrasena incorrectos");
    }
    if (usuario.estado !== "ACTIVO") {
      throw AppError.unauthorized("El usuario no esta activo");
    }

    const passwordValida = await verifyPassword(input.password, usuario.passwordHash);
    if (!passwordValida) {
      throw AppError.unauthorized("Email o contrasena incorrectos");
    }

    await this.usuarioRepository.marcarUltimoLogin(usuario.id, new Date());

    const accessToken = signAccessToken({
      sub: usuario.id,
      tenantId: usuario.tenantId,
      rolGlobal: usuario.rolGlobal,
    });
    const refreshToken = signRefreshToken({
      sub: usuario.id,
      tenantId: usuario.tenantId,
      tokenVersion: 0, // TODO: invalidacion de refresh tokens (revocar sesiones) queda para una v2
    });

    return { accessToken, refreshToken, usuario: toUsuarioPublico(usuario) };
  }
}
