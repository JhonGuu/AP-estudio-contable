import { inject, injectable } from "inversify";
import { TareaRepository } from "../infra/TareaRepository.js";
import type { EstadoTarea, TareaConItems } from "../domain/TareaEstudio.js";

export interface FiltrosListarTareas {
  empresaId?: string;
  asignadoAUsuarioId?: string;
  estado?: EstadoTarea;
}

/** GET /estudio/tareas?empresaId=&asignadoAUsuarioId=&estado= — siempre a nivel tenant. */
@injectable()
export class ListarTareas {
  constructor(@inject(TareaRepository) private readonly tareaRepository: TareaRepository) {}

  async ejecutar(tenantId: string, filtros: FiltrosListarTareas): Promise<TareaConItems[]> {
    return this.tareaRepository.listarPorTenant(tenantId, filtros);
  }
}
