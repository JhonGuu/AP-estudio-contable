import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { planCuenta } from "./schema.js";
import type { CuentaContable, TipoCuenta } from "../domain/CuentaContable.js";

function toDomain(row: typeof planCuenta.$inferSelect): CuentaContable {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    codigo: row.codigo,
    nombre: row.nombre,
    tipo: row.tipo,
    imputable: row.imputable,
  };
}

export interface CrearCuentaInput {
  tenantId: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
}

@injectable()
export class PlanCuentaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearCuentaInput): Promise<CuentaContable> {
    const [row] = await this.db.insert(planCuenta).values(input).returning();
    if (!row) throw new Error("No se pudo crear la cuenta contable");
    return toDomain(row);
  }

  async buscarPorCodigo(empresaId: string, codigo: string): Promise<CuentaContable | null> {
    const row = await this.db.query.planCuenta.findFirst({
      where: and(eq(planCuenta.empresaId, empresaId), eq(planCuenta.codigo, codigo)),
    });
    return row ? toDomain(row) : null;
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<CuentaContable | null> {
    const row = await this.db.query.planCuenta.findFirst({
      where: and(eq(planCuenta.id, id), eq(planCuenta.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<CuentaContable[]> {
    const rows = await this.db.query.planCuenta.findMany({ where: eq(planCuenta.empresaId, empresaId) });
    return rows.map(toDomain);
  }
}
