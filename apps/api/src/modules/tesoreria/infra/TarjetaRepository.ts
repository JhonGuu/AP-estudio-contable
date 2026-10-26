import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { tarjeta } from "./schema.js";
import type { Tarjeta } from "../domain/Tarjeta.js";

function toDomain(row: typeof tarjeta.$inferSelect): Tarjeta {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    nombre: row.nombre,
    cuentaLiquidadoraId: row.cuentaLiquidadoraId,
    activa: row.activa,
  };
}

export interface CrearTarjetaInput {
  tenantId: string;
  empresaId: string;
  nombre: string;
  cuentaLiquidadoraId: string;
}

@injectable()
export class TarjetaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearTarjetaInput): Promise<Tarjeta> {
    const [row] = await this.db.insert(tarjeta).values(input).returning();
    if (!row) throw new Error("No se pudo crear la tarjeta");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Tarjeta | null> {
    const row = await this.db.query.tarjeta.findFirst({
      where: and(eq(tarjeta.id, id), eq(tarjeta.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Tarjeta[]> {
    const rows = await this.db.query.tarjeta.findMany({ where: eq(tarjeta.empresaId, empresaId) });
    return rows.map(toDomain);
  }
}
