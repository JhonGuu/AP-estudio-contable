import { and, asc, eq, gte, lte } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { vencimientoFiscal } from "./schema.js";
import type { EstadoVencimiento, TipoVencimiento, VencimientoFiscal } from "../domain/VencimientoFiscal.js";

function toDomain(row: typeof vencimientoFiscal.$inferSelect): VencimientoFiscal {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    tipo: row.tipo,
    descripcion: row.descripcion,
    periodo: row.periodo,
    fechaVencimiento: row.fechaVencimiento,
    estado: row.estado,
    fechaCumplido: row.fechaCumplido,
    asignadoAUsuarioId: row.asignadoAUsuarioId,
    creadoPorUsuarioId: row.creadoPorUsuarioId,
    fechaCreacion: row.fechaCreacion,
  };
}

export interface CrearVencimientoInput {
  tenantId: string;
  empresaId: string;
  tipo: TipoVencimiento;
  descripcion: string | null;
  periodo: string | null;
  fechaVencimiento: Date;
  asignadoAUsuarioId: string | null;
  creadoPorUsuarioId: string;
}

export interface FiltrosListarVencimientos {
  empresaId?: string;
  tipo?: TipoVencimiento;
  estado?: EstadoVencimiento;
  desde?: Date;
  hasta?: Date;
}

@injectable()
export class VencimientoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearVencimientoInput): Promise<VencimientoFiscal> {
    const [row] = await this.db.insert(vencimientoFiscal).values(input).returning();
    if (!row) throw new Error("No se pudo crear el vencimiento");
    return toDomain(row);
  }

  async buscarPorIdYTenant(id: string, tenantId: string): Promise<VencimientoFiscal | null> {
    const row = await this.db.query.vencimientoFiscal.findFirst({
      where: and(eq(vencimientoFiscal.id, id), eq(vencimientoFiscal.tenantId, tenantId)),
    });
    return row ? toDomain(row) : null;
  }

  /** Nota: nombre de empresa/usuario se resuelve en el frontend, igual que TareaRepository. */
  async listarPorTenant(tenantId: string, filtros: FiltrosListarVencimientos): Promise<VencimientoFiscal[]> {
    const condiciones = [eq(vencimientoFiscal.tenantId, tenantId)];
    if (filtros.empresaId) condiciones.push(eq(vencimientoFiscal.empresaId, filtros.empresaId));
    if (filtros.tipo) condiciones.push(eq(vencimientoFiscal.tipo, filtros.tipo));
    if (filtros.estado) condiciones.push(eq(vencimientoFiscal.estado, filtros.estado));
    if (filtros.desde) condiciones.push(gte(vencimientoFiscal.fechaVencimiento, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(vencimientoFiscal.fechaVencimiento, filtros.hasta));

    const rows = await this.db.query.vencimientoFiscal.findMany({
      where: and(...condiciones),
      // Orden ascendente por fecha de vencimiento: es un calendario, no un historial — se quiere ver
      // primero lo que vence antes (a diferencia de TareaRepository, que ordena por fecha de creacion desc).
      orderBy: [asc(vencimientoFiscal.fechaVencimiento)],
    });

    return rows.map(toDomain);
  }

  async actualizarEstado(id: string, estado: EstadoVencimiento, fechaCumplido: Date | null): Promise<VencimientoFiscal> {
    const [row] = await this.db
      .update(vencimientoFiscal)
      .set({ estado, fechaCumplido })
      .where(eq(vencimientoFiscal.id, id))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el estado del vencimiento");
    return toDomain(row);
  }

  async eliminar(id: string): Promise<void> {
    await this.db.delete(vencimientoFiscal).where(eq(vencimientoFiscal.id, id));
  }
}
