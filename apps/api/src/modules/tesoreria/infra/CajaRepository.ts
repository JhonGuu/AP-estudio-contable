import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { caja } from "./schema.js";
import type { Caja } from "../domain/Caja.js";

function toDomain(row: typeof caja.$inferSelect): Caja {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    nombre: row.nombre,
    monedaId: row.monedaId,
    cuentaContableId: row.cuentaContableId,
    saldo: Number(row.saldo),
    activa: row.activa,
  };
}

export interface CrearCajaInput {
  tenantId: string;
  empresaId: string;
  nombre: string;
  monedaId: string;
  cuentaContableId: string;
}

@injectable()
export class CajaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearCajaInput): Promise<Caja> {
    const [row] = await this.db.insert(caja).values(input).returning();
    if (!row) throw new Error("No se pudo crear la caja");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Caja | null> {
    const row = await this.db.query.caja.findFirst({ where: and(eq(caja.id, id), eq(caja.empresaId, empresaId)) });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Caja[]> {
    const rows = await this.db.query.caja.findMany({ where: eq(caja.empresaId, empresaId) });
    return rows.map(toDomain);
  }

  /** Ajuste atomico del saldo (mismo patron que compra_comprobante.saldo_pendiente) — delta puede ser negativo. */
  async ajustarSaldo(id: string, delta: number): Promise<void> {
    await this.db
      .update(caja)
      .set({ saldo: sql`${caja.saldo} + ${delta.toFixed(2)}` })
      .where(eq(caja.id, id));
  }
}
