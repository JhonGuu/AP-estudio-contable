import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { TareaRepository } from "../infra/TareaRepository.js";
import type { ItemChecklistTarea } from "../domain/TareaEstudio.js";

/** POST /estudio/tareas/items/:itemId — togglea completado de un item de checklist. */
@injectable()
export class MarcarItemChecklist {
  constructor(@inject(TareaRepository) private readonly tareaRepository: TareaRepository) {}

  async ejecutar(context: AuthContext, itemId: string, completado: boolean): Promise<ItemChecklistTarea> {
    const encontrado = await this.tareaRepository.buscarItemConTarea(itemId);
    if (!encontrado || encontrado.tarea.tenantId !== context.tenantId) {
      throw AppError.notFound("Item de checklist no encontrado en este estudio");
    }

    return this.tareaRepository.marcarItem(itemId, completado);
  }
}
