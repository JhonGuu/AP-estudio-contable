import { and, asc, desc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { tareaEstudio, tareaEstudioItem } from "./schema.js";
import type { EstadoTarea, ItemChecklistTarea, TareaConItems, TareaEstudio } from "../domain/TareaEstudio.js";

function toDomain(row: typeof tareaEstudio.$inferSelect): TareaEstudio {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    titulo: row.titulo,
    descripcion: row.descripcion,
    asignadoAUsuarioId: row.asignadoAUsuarioId,
    creadoPorUsuarioId: row.creadoPorUsuarioId,
    fechaLimite: row.fechaLimite,
    estado: row.estado,
    fechaCreacion: row.fechaCreacion,
    fechaCompletada: row.fechaCompletada,
  };
}

function itemToDomain(row: typeof tareaEstudioItem.$inferSelect): ItemChecklistTarea {
  return {
    id: row.id,
    tareaId: row.tareaId,
    descripcion: row.descripcion,
    completado: row.completado,
    orden: row.orden,
  };
}

export interface CrearTareaInput {
  tenantId: string;
  empresaId: string | null;
  titulo: string;
  descripcion: string | null;
  asignadoAUsuarioId: string;
  creadoPorUsuarioId: string;
  fechaLimite: Date | null;
}

export interface FiltrosListarTareas {
  empresaId?: string;
  asignadoAUsuarioId?: string;
  estado?: EstadoTarea;
}

@injectable()
export class TareaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearTareaInput): Promise<TareaEstudio> {
    const [row] = await this.db.insert(tareaEstudio).values(input).returning();
    if (!row) throw new Error("No se pudo crear la tarea");
    return toDomain(row);
  }

  async buscarPorIdYTenant(id: string, tenantId: string): Promise<TareaEstudio | null> {
    const row = await this.db.query.tareaEstudio.findFirst({
      where: and(eq(tareaEstudio.id, id), eq(tareaEstudio.tenantId, tenantId)),
    });
    return row ? toDomain(row) : null;
  }

  /** Lista con los items de checklist ya resueltos (nota: nombres de empresa/usuario se resuelven en el frontend). */
  async listarPorTenant(tenantId: string, filtros: FiltrosListarTareas): Promise<TareaConItems[]> {
    const condiciones = [eq(tareaEstudio.tenantId, tenantId)];
    if (filtros.empresaId) condiciones.push(eq(tareaEstudio.empresaId, filtros.empresaId));
    if (filtros.asignadoAUsuarioId) condiciones.push(eq(tareaEstudio.asignadoAUsuarioId, filtros.asignadoAUsuarioId));
    if (filtros.estado) condiciones.push(eq(tareaEstudio.estado, filtros.estado));

    const rows = await this.db.query.tareaEstudio.findMany({
      where: and(...condiciones),
      with: { items: { orderBy: [asc(tareaEstudioItem.orden)] } },
      orderBy: [desc(tareaEstudio.fechaCreacion)],
    });

    return rows.map((row) => ({ ...toDomain(row), items: row.items.map(itemToDomain) }));
  }

  async actualizarEstado(
    id: string,
    estado: EstadoTarea,
    fechaCompletada: Date | null,
  ): Promise<TareaEstudio> {
    const [row] = await this.db
      .update(tareaEstudio)
      .set({ estado, fechaCompletada })
      .where(eq(tareaEstudio.id, id))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el estado de la tarea");
    return toDomain(row);
  }

  async contarItems(tareaId: string): Promise<number> {
    const rows = await this.db.query.tareaEstudioItem.findMany({ where: eq(tareaEstudioItem.tareaId, tareaId) });
    return rows.length;
  }

  async agregarItem(tareaId: string, descripcion: string, orden: number): Promise<ItemChecklistTarea> {
    const [row] = await this.db
      .insert(tareaEstudioItem)
      .values({ tareaId, descripcion, orden })
      .returning();
    if (!row) throw new Error("No se pudo agregar el item de checklist");
    return itemToDomain(row);
  }

  async buscarItemConTarea(
    itemId: string,
  ): Promise<{ item: ItemChecklistTarea; tarea: TareaEstudio } | null> {
    const row = await this.db.query.tareaEstudioItem.findFirst({
      where: eq(tareaEstudioItem.id, itemId),
      with: { tarea: true },
    });
    if (!row) return null;
    return { item: itemToDomain(row), tarea: toDomain(row.tarea) };
  }

  async marcarItem(itemId: string, completado: boolean): Promise<ItemChecklistTarea> {
    const [row] = await this.db
      .update(tareaEstudioItem)
      .set({ completado })
      .where(eq(tareaEstudioItem.id, itemId))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el item de checklist");
    return itemToDomain(row);
  }
}
