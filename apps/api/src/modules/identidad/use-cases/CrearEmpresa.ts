import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import { EmpresaRepository, type CrearEmpresaInput } from "../infra/EmpresaRepository.js";
import { UsuarioEmpresaRepository } from "../infra/UsuarioEmpresaRepository.js";
import { ActivarModelosAsientoDeFabrica } from "../../contabilidad/use-cases/ActivarModelosAsientoDeFabrica.js";
import { ROLES_CON_ALTA_EMPRESA } from "../domain/roles.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import type { Empresa } from "../domain/Empresa.js";

/**
 * POST /empresas — nota 06, seccion 4: "requiere rol OWNER/ADMIN". No usa
 * X-Empresa-Id (todavia no existe la empresa) — solo el JWT (nota 06, punto 4
 * de la seccion 3: "endpoints que no son de un modulo de negocio... solo el JWT").
 * Quien la crea queda con acceso OWNER a ella automaticamente. Ademas activa
 * los modelos de asiento "de fabrica" de contabilidad (nota 07, "Flujo de
 * alta") para que el circuito comercial pueda confirmar comprobantes desde
 * el primer momento, sin un paso manual de configuracion contable previo.
 */
@injectable()
export class CrearEmpresa {
  constructor(
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(UsuarioEmpresaRepository) private readonly usuarioEmpresaRepository: UsuarioEmpresaRepository,
    @inject(ActivarModelosAsientoDeFabrica) private readonly activarModelosAsientoDeFabrica: ActivarModelosAsientoDeFabrica,
  ) {}

  async ejecutar(auth: AuthContext, input: Omit<CrearEmpresaInput, "tenantId">): Promise<Empresa> {
    if (!ROLES_CON_ALTA_EMPRESA.includes(auth.rolGlobal)) {
      throw AppError.forbidden("Solo OWNER/ADMIN pueden dar de alta una empresa");
    }

    const empresa = await this.empresaRepository.crear({ ...input, tenantId: auth.tenantId });
    await this.usuarioEmpresaRepository.asignar(auth.usuarioId, empresa.id, "OWNER");
    await this.activarModelosAsientoDeFabrica.ejecutar(auth.tenantId, empresa.id);
    return empresa;
  }
}
