import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { chequera } from "./schema.js";
import type { Chequera } from "../domain/Chequera.js";

function toDomain(row: typeof chequera.$inferSelect): Chequera {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    cuentaBancariaId: row.cuentaBancariaId,
    numeroDesde: row.numeroDesde,
    numeroHasta: row.numeroHasta,
    proximoNumero: row.proximoNumero,
    activa: row.activa,
  };
}

export interface CrearChequeraInput {
  tenantId: string;
  empresaId: string;
  cuentaBancariaId: string;
  numeroDesde: number;
  numeroHasta: number;
}

@injectable()
export class ChequeraRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearChequeraInput): Promise<Chequera> {
    const [row] = await this.db
      .insert(chequera)
      .values({ ...input, proximoNumero: input.numeroDesde })
      .returning();
    if (!row) throw new Error("No se pudo crear la chequera");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Chequera | null> {
    const row = await this.db.query.chequera.findFirst({
      where: and(eq(chequera.id, id), eq(chequera.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Chequera[]> {
    const rows = await this.db.query.chequera.findMany({ where: eq(chequera.empresaId, empresaId) });
    return rows.map(toDomain);
  }

  /** Numeracion atomica del proximo cheque propio a emitir de esta chequera (mismo patron que comprobante_secuencia). */
  async siguienteNumero(id: string): Promise<number> {
    const [row] = await this.db
      .update(chequera)
      .set({ proximoNumero: sql`${chequera.proximoNumero} + 1` })
      .where(eq(chequera.id, id))
      .returning({ proximoNumero: chequera.proximoNumero, numeroAnterior: sql<number>`${chequera.proximoNumero} - 1` });
    if (!row) throw new Error("No se pudo generar el numero de cheque");
    return row.numeroAnterior;
  }
}
