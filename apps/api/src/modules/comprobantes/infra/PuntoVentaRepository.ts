import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { puntoVenta } from "./schema.js";
import type { PuntoVenta } from "../domain/PuntoVenta.js";

function toDomain(row: typeof puntoVenta.$inferSelect): PuntoVenta {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    numero: row.numero,
    nombre: row.nombre,
    activo: row.activo,
  };
}

export interface CrearPuntoVentaInput {
  tenantId: string;
  empresaId: string;
  numero: number;
  nombre: string;
}

/** ABM de puntos de venta de la empresa activa (nota 08, seccion 5). */
@injectable()
export class PuntoVentaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearPuntoVentaInput): Promise<PuntoVenta> {
    const [row] = await this.db.insert(puntoVenta).values(input).returning();
    if (!row) throw new Error("No se pudo crear el punto de venta");
    return toDomain(row);
  }

  async listarPorEmpresa(empresaId: string): Promise<PuntoVenta[]> {
    const rows = await this.db.query.puntoVenta.findMany({ where: eq(puntoVenta.empresaId, empresaId) });
    return rows.map(toDomain);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<PuntoVenta | null> {
    const row = await this.db.query.puntoVenta.findFirst({
      where: and(eq(puntoVenta.id, id), eq(puntoVenta.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }
}
