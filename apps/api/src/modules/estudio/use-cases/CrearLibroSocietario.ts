import { inject, injectable } from "inversify";
import { AppError } from "../../../shared/http/AppError.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { LibroSocietario, TipoLibroSocietario } from "../domain/LibroSocietario.js";

export interface CrearLibroSocietarioInput {
  empresaId: string;
  tipo: TipoLibroSocietario;
  numero: number;
  cantidadFolios?: number | null;
  fechaRubrica?: Date | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

/**
 * POST /estudio/libros-societarios. Igual que CrearVencimiento, la empresa
 * es siempre obligatoria (no hay "libro interno del estudio") — nace en
 * estado EN_USO (default de la tabla).
 */
@injectable()
export class CrearLibroSocietario {
  constructor(
    @inject(LibroSocietarioRepository) private readonly libroRepository: LibroSocietarioRepository,
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
  ) {}

  async ejecutar(context: AuthContext, input: CrearLibroSocietarioInput): Promise<LibroSocietario> {
    const empresa = await this.empresaRepository.buscarPorIdYTenant(input.empresaId, context.tenantId);
    if (!empresa) throw AppError.notFound("Empresa no encontrada en este estudio");

    return this.libroRepository.crear({
      tenantId: context.tenantId,
      empresaId: input.empresaId,
      tipo: input.tipo,
      numero: input.numero,
      cantidadFolios: input.cantidadFolios ?? null,
      fechaRubrica: input.fechaRubrica ?? null,
      ubicacion: input.ubicacion ?? null,
      observaciones: input.observaciones ?? null,
      creadoPorUsuarioId: context.usuarioId,
    });
  }
}
