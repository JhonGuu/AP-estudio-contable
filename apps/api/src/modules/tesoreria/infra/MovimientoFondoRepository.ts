import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { movimientoFondo } from "./schema.js";
import type { MovimientoFondo, NuevoMovimientoFondo } from "../domain/MovimientoFondo.js";

function toDomain(row: typeof movimientoFondo.$inferSelect): MovimientoFondo {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    fecha: row.fecha,
    tipo: row.tipo,
    cuentaOrigenTipo: row.cuentaOrigenTipo,
    cuentaOrigenId: row.cuentaOrigenId,
    cuentaDestinoTipo: row.cuentaDestinoTipo,
    cuentaDestinoId: row.cuentaDestinoId,
    importe: Number(row.importe),
    descripcion: row.descripcion,
  };
}

export interface CrearMovimientoFondoInput extends NuevoMovimientoFondo {
  tenantId: string;
  empresaId: string;
}

@injectable()
export class MovimientoFondoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearMovimientoFondoInput): Promise<MovimientoFondo> {
    const [row] = await this.db
      .insert(movimientoFondo)
      .values({ ...input, importe: input.importe.toFixed(2) })
      .returning();
    if (!row) throw new Error("No se pudo crear el movimiento de fondo");
    return toDomain(row);
  }

  async listarPorEmpresa(empresaId: string): Promise<MovimientoFondo[]> {
    const rows = await this.db.query.movimientoFondo.findMany({ where: eq(movimientoFondo.empresaId, empresaId) });
    return rows.map(toDomain);
  }
}
