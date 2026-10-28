import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { VencimientoRepository } from "../infra/VencimientoRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { UsuarioRepository } from "../../identidad/infra/UsuarioRepository.js";
import type { TipoVencimiento, VencimientoFiscal } from "../domain/VencimientoFiscal.js";

export interface CrearVencimientoInput {
  empresaId: string;
  tipo: TipoVencimiento;
  descripcion?: string | null;
  periodo?: string | null;
  fechaVencimiento: Date;
  asignadoAUsuarioId?: string | null;
}

/**
 * POST /estudio/vencimientos. A diferencia de CrearTarea, la empresa es
 * siempre obligatoria (no hay "vencimiento interno del estudio") y el
 * asignado es opcional (se puede anotar el vencimiento sin asignarlo todavia).
 */
@injectable()
export class CrearVencimiento {
  constructor(
    @inject(VencimientoRepository) private readonly vencimientoRepository: VencimientoRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(UsuarioRepository) private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async ejecutar(context: AuthContext, input: CrearVencimientoInput): Promise<VencimientoFiscal> {
    const empresa = await this.empresaRepository.buscarPorIdYTenant(input.empresaId, context.tenantId);
    if (!empresa) throw AppError.notFound("Empresa no encontrada en este estudio");

    if (input.asignadoAUsuarioId) {
      const asignado = await this.usuarioRepository.buscarPorId(input.asignadoAUsuarioId);
      if (!asignado || asignado.tenantId !== context.tenantId) {
        throw AppError.badRequest("El usuario asignado no pertenece a este estudio", "USUARIO_ASIGNADO_INVALIDO");
      }
    }

    return this.vencimientoRepository.crear({
      tenantId: context.tenantId,
      empresaId: input.empresaId,
      tipo: input.tipo,
      descripcion: input.descripcion ?? null,
      periodo: input.periodo ?? null,
      fechaVencimiento: input.fechaVencimiento,
      asignadoAUsuarioId: input.asignadoAUsuarioId ?? null,
      creadoPorUsuarioId: context.usuarioId,
    });
  }
}
