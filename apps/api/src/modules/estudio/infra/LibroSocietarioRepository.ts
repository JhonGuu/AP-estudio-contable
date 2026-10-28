import { and, desc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { libroSocietario } from "./schema.js";
import type { EstadoLibroSocietario, LibroSocietario, TipoLibroSocietario } from "../domain/LibroSocietario.js";

function toDomain(row: typeof libroSocietario.$inferSelect): LibroSocietario {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    tipo: row.tipo,
    numero: row.numero,
    cantidadFolios: row.cantidadFolios,
    ultimoFolioUtilizado: row.ultimoFolioUtilizado,
    fechaRubrica: row.fechaRubrica,
    ubicacion: row.ubicacion,
    estado: row.estado,
    observaciones: row.observaciones,
    creadoPorUsuarioId: row.creadoPorUsuarioId,
    fechaCreacion: row.fechaCreacion,
  };
}

export interface CrearLibroSocietarioInput {
  tenantId: string;
  empresaId: string;
  tipo: TipoLibroSocietario;
  numero: number;
  cantidadFolios: number | null;
  fechaRubrica: Date | null;
  ubicacion: string | null;
  observaciones: string | null;
  creadoPorUsuarioId: string;
}

export interface FiltrosListarLibrosSocietarios {
  empresaId?: string;
  tipo?: TipoLibroSocietario;
  estado?: EstadoLibroSocietario;
}

export interface EditarLibroSocietarioInput {
  estado?: EstadoLibroSocietario;
  ultimoFolioUtilizado?: number | null;
  fechaRubrica?: Date | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

@injectable()
export class LibroSocietarioRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearLibroSocietarioInput): Promise<LibroSocietario> {
    const [row] = await this.db.insert(libroSocietario).values(input).returning();
    if (!row) throw new Error("No se pudo crear el libro societario");
    return toDomain(row);
  }

  async buscarPorIdYTenant(id: string, tenantId: string): Promise<LibroSocietario | null> {
    const row = await this.db.query.libroSocietario.findFirst({
      where: and(eq(libroSocietario.id, id), eq(libroSocietario.tenantId, tenantId)),
    });
    return row ? toDomain(row) : null;
  }

  /** Nota: nombre de empresa se resuelve en el frontend, igual que VencimientoRepository. */
  async listarPorTenant(tenantId: string, filtros: FiltrosListarLibrosSocietarios): Promise<LibroSocietario[]> {
    const condiciones = [eq(libroSocietario.tenantId, tenantId)];
    if (filtros.empresaId) condiciones.push(eq(libroSocietario.empresaId, filtros.empresaId));
    if (filtros.tipo) condiciones.push(eq(libroSocietario.tipo, filtros.tipo));
    if (filtros.estado) condiciones.push(eq(libroSocietario.estado, filtros.estado));

    const rows = await this.db.query.libroSocietario.findMany({
      where: and(...condiciones),
      orderBy: [desc(libroSocietario.fechaCreacion)],
    });

    return rows.map(toDomain);
  }

  async editar(id: string, patch: EditarLibroSocietarioInput): Promise<LibroSocietario> {
    const [row] = await this.db.update(libroSocietario).set(patch).where(eq(libroSocietario.id, id)).returning();
    if (!row) throw new Error("No se pudo actualizar el libro societario");
    return toDomain(row);
  }

  async eliminar(id: string): Promise<void> {
    await this.db.delete(libroSocietario).where(eq(libroSocietario.id, id));
  }
}
