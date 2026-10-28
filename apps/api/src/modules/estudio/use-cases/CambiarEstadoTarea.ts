import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { TareaRepository } from "../infra/TareaRepository.js";
import { transicionEstadoValida, type EstadoTarea, type TareaEstudio } from "../domain/TareaEstudio.js";

/** POST /estudio/tareas/:id/estado. */
@injectable()
export class CambiarEstadoTarea {
  constructor(@inject(TareaRepository) private readonly tareaRepository: TareaRepository) {}

  async ejecutar(context: AuthContext, tareaId: string, estadoNuevo: EstadoTarea): Promise<TareaEstudio> {
    const tarea = await this.tareaRepository.buscarPorIdYTenant(tareaId, context.tenantId);
    if (!tarea) throw AppError.notFound("Tarea no encontrada en este estudio");

    if (!transicionEstadoValida(tarea.estado, estadoNuevo)) {
      throw new AppError(
        422,
        `No se puede pasar una tarea de ${tarea.estado} a ${estadoNuevo}`,
        "TRANSICION_ESTADO_INVALIDA",
      );
    }

    const fechaCompletada = estadoNuevo === "COMPLETADA" ? new Date() : null;
    return this.tareaRepository.actualizarEstado(tareaId, estadoNuevo, fechaCompletada);
  }
}
