import { inject, injectable } from "inversify";
import { CajaRepository } from "../infra/CajaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { Caja } from "../domain/Caja.js";

export interface RegistrarCajaInput {
  nombre: string;
  monedaId: string;
  cuentaContableId: string;
}

/** POST /tesoreria/cajas (nota 22, seccion 6). */
@injectable()
export class RegistrarCaja {
  constructor(@inject(CajaRepository) private readonly cajaRepository: CajaRepository) {}

  async ejecutar(context: EmpresaContext, input: RegistrarCajaInput): Promise<Caja> {
    return this.cajaRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      nombre: input.nombre,
      monedaId: input.monedaId,
      cuentaContableId: input.cuentaContableId,
    });
  }
}
