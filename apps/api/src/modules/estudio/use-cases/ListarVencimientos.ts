import { inject, injectable } from "inversify";
import { VencimientoRepository } from "../infra/VencimientoRepository.js";
import type { EstadoVencimiento, TipoVencimiento, VencimientoFiscal } from "../domain/VencimientoFiscal.js";

export interface FiltrosListarVencimientos {
  empresaId?: string;
  tipo?: TipoVencimiento;
  estado?: EstadoVencimiento;
  desde?: Date;
  hasta?: Date;
}

/** GET /estudio/vencimientos?empresaId=&tipo=&estado=&desde=&hasta= — siempre a nivel tenant. */
@injectable()
export class ListarVencimientos {
  constructor(@inject(VencimientoRepository) private readonly vencimientoRepository: VencimientoRepository) {}

  async ejecutar(tenantId: string, filtros: FiltrosListarVencimientos): Promise<VencimientoFiscal[]> {
    return this.vencimientoRepository.listarPorTenant(tenantId, filtros);
  }
}
