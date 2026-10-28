import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { VencimientoRepository } from "../infra/VencimientoRepository.js";

/** DELETE /estudio/vencimientos/:id — para corregir un vencimiento cargado por error. */
@injectable()
export class EliminarVencimiento {
  constructor(@inject(VencimientoRepository) private readonly vencimientoRepository: VencimientoRepository) {}

  async ejecutar(context: AuthContext, vencimientoId: string): Promise<void> {
    const vencimiento = await this.vencimientoRepository.buscarPorIdYTenant(vencimientoId, context.tenantId);
    if (!vencimiento) throw AppError.notFound("Vencimiento no encontrado en este estudio");

    await this.vencimientoRepository.eliminar(vencimientoId);
  }
}
