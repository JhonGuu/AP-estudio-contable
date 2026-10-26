import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { cuentaBancaria } from "./schema.js";
import type { CuentaBancaria } from "../domain/CuentaBancaria.js";

function toDomain(row: typeof cuentaBancaria.$inferSelect): CuentaBancaria {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    nombre: row.nombre,
    cbu: row.cbu,
    banco: row.banco,
    monedaId: row.monedaId,
    cuentaContableId: row.cuentaContableId,
    saldo: Number(row.saldo),
    activa: row.activa,
  };
}

export interface CrearCuentaBancariaInput {
  tenantId: string;
  empresaId: string;
  nombre: string;
  cbu?: string | null;
  banco: string;
  monedaId: string;
  cuentaContableId: string;
}

@injectable()
export class CuentaBancariaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearCuentaBancariaInput): Promise<CuentaBancaria> {
    const [row] = await this.db.insert(cuentaBancaria).values(input).returning();
    if (!row) throw new Error("No se pudo crear la cuenta bancaria");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<CuentaBancaria | null> {
    const row = await this.db.query.cuentaBancaria.findFirst({
      where: and(eq(cuentaBancaria.id, id), eq(cuentaBancaria.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<CuentaBancaria[]> {
    const rows = await this.db.query.cuentaBancaria.findMany({ where: eq(cuentaBancaria.empresaId, empresaId) });
    return rows.map(toDomain);
  }

  async ajustarSaldo(id: string, delta: number): Promise<void> {
    await this.db
      .update(cuentaBancaria)
      .set({ saldo: sql`${cuentaBancaria.saldo} + ${delta.toFixed(2)}` })
      .where(eq(cuentaBancaria.id, id));
  }
}
