import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { VencimientoRepository } from "../infra/VencimientoRepository.js";
import type { EstadoVencimiento, VencimientoFiscal } from "../domain/VencimientoFiscal.js";

/**
 * POST /estudio/vencimientos/:id/estado. Mas simple que CambiarEstadoTarea:
 * solo dos estados (PENDIENTE/CUMPLIDO), sin maquina de transiciones — se
 * puede des-marcar un vencimiento si se tildo por error.
 */
@injectable()
export class MarcarEstadoVencimiento {
  constructor(@inject(VencimientoRepository) private readonly vencimientoRepository: VencimientoRepository) {}

  async ejecutar(context: AuthContext, vencimientoId: string, estado: EstadoVencimiento): Promise<VencimientoFiscal> {
    const vencimiento = await this.vencimientoRepository.buscarPorIdYTenant(vencimientoId, context.tenantId);
    if (!vencimiento) throw AppError.notFound("Vencimiento no encontrado en este estudio");

    const fechaCumplido = estado === "CUMPLIDO" ? new Date() : null;
    return this.vencimientoRepository.actualizarEstado(vencimientoId, estado, fechaCumplido);
  }
}
