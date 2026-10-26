import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { cliente } from "./schema.js";
import type { Cliente } from "../domain/Cliente.js";

function toDomain(row: typeof cliente.$inferSelect): Cliente {
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

export interface CrearClienteInput {
  tenantId: string;
  empresaId: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** Todo metodo filtra por empresaId (nota 06, "regla de oro" — cliente.cuit unico por empresa, no global). */
@injectable()
export class ClienteRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearClienteInput): Promise<Cliente> {
    const [row] = await this.db.insert(cliente).values(input).returning();
    if (!row) throw new Error("No se pudo crear el cliente");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Cliente | null> {
    const row = await this.db.query.cliente.findFirst({
      where: and(eq(cliente.id, id), eq(cliente.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Cliente[]> {
    const rows = await this.db.query.cliente.findMany({ where: eq(cliente.empresaId, empresaId) });
    return rows.map(toDomain);
  }
}
