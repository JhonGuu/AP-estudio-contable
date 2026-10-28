import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { TareaRepository } from "../infra/TareaRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { UsuarioRepository } from "../../identidad/infra/UsuarioRepository.js";
import type { TareaEstudio } from "../domain/TareaEstudio.js";

export interface CrearTareaInput {
  /** null/omitido = tarea interna del estudio, no asociada a un cliente puntual. */
  empresaId?: string | null;
  titulo: string;
  descripcion?: string | null;
  asignadoAUsuarioId: string;
  fechaLimite?: Date | null;
}

/**
 * POST /estudio/tareas. A diferencia de los modulos de negocio, no requiere
 * empresa activa (authMiddleware solo) — el que crea la tarea elige a que
 * cliente corresponde (o ninguno) desde un selector, no desde el contexto
 * de empresa activa de la sesion.
 */
@injectable()
export class CrearTarea {
  constructor(
    @inject(TareaRepository) private readonly tareaRepository: TareaRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(UsuarioRepository) private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async ejecutar(context: AuthContext, input: CrearTareaInput): Promise<TareaEstudio> {
    if (input.empresaId) {
      const empresa = await this.empresaRepository.buscarPorIdYTenant(input.empresaId, context.tenantId);
      if (!empresa) throw AppError.notFound("Empresa no encontrada en este estudio");
    }

    const asignado = await this.usuarioRepository.buscarPorId(input.asignadoAUsuarioId);
    if (!asignado || asignado.tenantId !== context.tenantId) {
      throw AppError.badRequest("El usuario asignado no pertenece a este estudio", "USUARIO_ASIGNADO_INVALIDO");
    }

    return this.tareaRepository.crear({
      tenantId: context.tenantId,
      empresaId: input.empresaId ?? null,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      asignadoAUsuarioId: input.asignadoAUsuarioId,
      creadoPorUsuarioId: context.usuarioId,
      fechaLimite: input.fechaLimite ?? null,
    });
  }
}
