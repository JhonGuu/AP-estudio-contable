import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { proveedor } from "./schema.js";
import type { Proveedor } from "../domain/Proveedor.js";

function toDomain(row: typeof proveedor.$inferSelect): Proveedor {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    razonSocial: row.razonSocial,
    cuit: row.cuit,
    condicionIvaId: row.condicionIvaId,
    domicilio: row.domicilio,
    activo: row.activo,
  };
}

export interface CrearProveedorInput {
  tenantId: string;
  empresaId: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** Todo metodo filtra por empresaId (nota 06, "regla de oro" — proveedor.cuit unico por empresa, no global). */
@injectable()
export class ProveedorRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearProveedorInput): Promise<Proveedor> {
    const [row] = await this.db.insert(proveedor).values(input).returning();
    if (!row) throw new Error("No se pudo crear el proveedor");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Proveedor | null> {
    const row = await this.db.query.proveedor.findFirst({
      where: and(eq(proveedor.id, id), eq(proveedor.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Proveedor[]> {
    const rows = await this.db.query.proveedor.findMany({ where: eq(proveedor.empresaId, empresaId) });
    return rows.map(toDomain);
  }
}
