import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { tenant } from "./schema.js";
import type { Tenant } from "../domain/Tenant.js";

function toDomain(row: typeof tenant.$inferSelect): Tenant {
  return {
    id: row.id,
    razonSocial: row.razonSocial,
    cuit: row.cuit,
    emailContacto: row.emailContacto,
    plan: row.plan,
    estado: row.estado,
    fechaAlta: row.fechaAlta,
    fechaBaja: row.fechaBaja,
  };
}

export interface CrearTenantInput {
  razonSocial: string;
  cuit: string;
  emailContacto: string;
}

/**
 * Unico repositorio del modulo identidad que NO filtra por tenantId/empresaId
 * (nota 06, seccion 2): tenant es la raiz del aislamiento multi-tenant, no
 * hay un scope mas amplio que filtrarle.
 */
@injectable()
export class TenantRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearTenantInput): Promise<Tenant> {
    const [row] = await this.db.insert(tenant).values(input).returning();
    if (!row) throw new Error("No se pudo crear el tenant");
    return toDomain(row);
  }

  async buscarPorId(id: string): Promise<Tenant | null> {
    const row = await this.db.query.tenant.findFirst({ where: eq(tenant.id, id) });
    return row ? toDomain(row) : null;
  }

  async buscarPorCuit(cuit: string): Promise<Tenant | null> {
    const row = await this.db.query.tenant.findFirst({ where: eq(tenant.cuit, cuit) });
    return row ? toDomain(row) : null;
  }
}
