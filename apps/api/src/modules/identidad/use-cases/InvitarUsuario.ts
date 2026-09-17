import { injectable } from "inversify";
import { randomBytes } from "node:crypto";
import { AppError } from "../../../shared/http/AppError.js";
import { hashPassword } from "../../../shared/security/password.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import { ROLES_CON_ALTA_EMPRESA } from "../domain/roles.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { toUsuarioPublico, type UsuarioPublico } from "../domain/Usuario.js";
import type { RolGlobal } from "../domain/roles.js";

export interface InvitarUsuarioInput {
  email: string;
  nombre: string;
  apellido: string;
  rolGlobal: RolGlobal;
}

export interface InvitarUsuarioResult {
  usuario: UsuarioPublico;
  /**
   * v1: en vez de un flujo de email real (fuera de alcance del scaffold inicial),
   * se genera una contrasena temporal de un solo uso y se devuelve una unica vez
   * en la respuesta (nunca se vuelve a poder consultar) para que el OWNER/ADMIN
   * se la pase al invitado por el canal que prefiera. El usuario queda
   * INVITADO_PENDIENTE hasta su primer login.
   */
  passwordTemporal: string;
}

/** POST /usuarios — nota 06, seccion 4: "Invita a un usuario nuevo al tenant". */
@injectable()
export class InvitarUsuario {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async ejecutar(auth: AuthContext, input: InvitarUsuarioInput): Promise<InvitarUsuarioResult> {
    if (!ROLES_CON_ALTA_EMPRESA.includes(auth.rolGlobal)) {
      throw AppError.forbidden("Solo OWNER/ADMIN pueden invitar usuarios");
    }

    const existente = await this.usuarioRepository.buscarPorEmail(input.email);
    if (existente) {
      throw AppError.conflict("Ya existe un usuario con ese email", "USUARIO_EMAIL_DUPLICADO");
    }

    const passwordTemporal = randomBytes(9).toString("base64url");
    const passwordHash = await hashPassword(passwordTemporal);

    const usuario = await this.usuarioRepository.crear({
      tenantId: auth.tenantId,
      email: input.email,
      passwordHash,
      nombre: input.nombre,
      apellido: input.apellido,
      rolGlobal: input.rolGlobal,
      estado: "INVITADO_PENDIENTE",
    });

    return { usuario: toUsuarioPublico(usuario), passwordTemporal };
  }
}
