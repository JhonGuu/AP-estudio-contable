import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { tipoComprobante } from "./schema.js";
import type { AplicaA, TipoComprobante } from "../domain/TipoComprobante.js";

function toDomain(row: typeof tipoComprobante.$inferSelect): TipoComprobante {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    aplicaA: row.aplicaA,
    afectaIva: row.afectaIva,
    afectaCuentaCorriente: row.afectaCuentaCorriente,
    requiereCae: row.requiereCae,
  };
}

@injectable()
export class TipoComprobanteRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  /** GET /tipos-comprobante (nota 08, seccion 5) — catalogo global, solo lectura para el usuario. */
  async listar(aplicaA?: AplicaA): Promise<TipoComprobante[]> {
    const rows = aplicaA
      ? await this.db.query.tipoComprobante.findMany({
          where: inArray(tipoComprobante.aplicaA, [aplicaA, "AMBOS"]),
        })
      : await this.db.query.tipoComprobante.findMany();
    return rows.map(toDomain);
  }

  async buscarPorId(id: string): Promise<TipoComprobante | null> {
    const row = await this.db.query.tipoComprobante.findFirst({ where: eq(tipoComprobante.id, id) });
    return row ? toDomain(row) : null;
  }
}
