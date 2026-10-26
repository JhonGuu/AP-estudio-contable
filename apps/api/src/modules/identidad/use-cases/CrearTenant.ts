import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { hashPassword } from "../../../shared/security/password.js";
import { TenantRepository } from "../infra/TenantRepository.js";
import { UsuarioRepository } from "../infra/UsuarioRepository.js";
import type { Tenant } from "../domain/Tenant.js";
import { toUsuarioPublico, type UsuarioPublico } from "../domain/Usuario.js";

export interface CrearTenantInput {
  razonSocial: string;
  cuit: string;
  emailContacto: string;
  ownerNombre: string;
  ownerApellido: string;
  ownerPassword: string;
}

export interface CrearTenantResult {
  tenant: Tenant;
  owner: UsuarioPublico;
}

/**
 * POST /tenants — nota 06, seccion 4: "Alta de un estudio nuevo (self-service
 * signup) — crea el tenant + el primer usuario con rol OWNER".
 */
@injectable()
export class CrearTenant {
  constructor(
    @inject(TenantRepository) private readonly tenantRepository: TenantRepository,
    @inject(UsuarioRepository) private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async ejecutar(input: CrearTenantInput): Promise<CrearTenantResult> {
    const existente = await this.tenantRepository.buscarPorCuit(input.cuit);
    if (existente) {
      throw AppError.conflict("Ya existe un estudio registrado con ese CUIT", "TENANT_CUIT_DUPLICADO");
    }

    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(input.emailContacto);
    if (usuarioExistente) {
      throw AppError.conflict("Ya existe un usuario con ese email", "USUARIO_EMAIL_DUPLICADO");
    }

    const tenant = await this.tenantRepository.crear({
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      emailContacto: input.emailContacto,
    });

    const passwordHash = await hashPassword(input.ownerPassword);
    const owner = await this.usuarioRepository.crear({
      tenantId: tenant.id,
      email: input.emailContacto,
      passwordHash,
      nombre: input.ownerNombre,
      apellido: input.ownerApellido,
      rolGlobal: "OWNER",
      estado: "ACTIVO",
    });

    return { tenant, owner: toUsuarioPublico(owner) };
  }
}
