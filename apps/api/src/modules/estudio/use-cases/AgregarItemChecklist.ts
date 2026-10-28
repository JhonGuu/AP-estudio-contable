import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { TareaRepository } from "../infra/TareaRepository.js";
import type { ItemChecklistTarea } from "../domain/TareaEstudio.js";

/** POST /estudio/tareas/:id/items — agrega un item de checklist/mini-tarea a una tarea existente. */
@injectable()
export class AgregarItemChecklist {
  constructor(@inject(TareaRepository) private readonly tareaRepository: TareaRepository) {}

  async ejecutar(context: AuthContext, tareaId: string, descripcion: string): Promise<ItemChecklistTarea> {
    const tarea = await this.tareaRepository.buscarPorIdYTenant(tareaId, context.tenantId);
    if (!tarea) throw AppError.notFound("Tarea no encontrada en este estudio");

    const orden = await this.tareaRepository.contarItems(tareaId);
    return this.tareaRepository.agregarItem(tareaId, descripcion, orden);
  }
}
