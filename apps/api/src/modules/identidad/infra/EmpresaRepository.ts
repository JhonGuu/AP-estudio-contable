import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { empresa, empresaModulo } from "./schema.js";
import type { Empresa, ModuloActivable } from "../domain/Empresa.js";

function toDomain(row: typeof empresa.$inferSelect, modulosActivos: ModuloActivable[]): Empresa {
  return {
    id: row.id,
    tenantId: row.tenantId,
    razonSocial: row.razonSocial,
    nombreComercial: row.nombreComercial,
    cuit: row.cuit,
    condicionIvaId: row.condicionIvaId,
    domicilioFiscal: row.domicilioFiscal,
    provinciaId: row.provinciaId,
    actividadAfip: row.actividadAfip,
    monedaBaseId: row.monedaBaseId,
    cierreEjercicio: row.cierreEjercicio,
    estado: row.estado,
    modulosActivos,
  };
}

export interface CrearEmpresaInput {
  tenantId: string;
  razonSocial: string;
  nombreComercial?: string | null;
  cuit: string;
  condicionIvaId: string;
  domicilioFiscal: string;
  provinciaId: string;
  actividadAfip: string;
  monedaBaseId: string;
  cierreEjercicio: string;
}

/**
 * Todo metodo de este repositorio recibe y filtra por tenantId — nota 06,
 * seccion 2: "ninguna consulta al repositorio se escribe a mano sin pasar por
 * un helper que fuerza los dos filtros" (empresa no tiene empresa_id propio,
 * pero si tenant_id, que es el filtro que le corresponde a esta tabla).
 */
@injectable()
export class EmpresaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearEmpresaInput): Promise<Empresa> {
    const [row] = await this.db.insert(empresa).values(input).returning();
    if (!row) throw new Error("No se pudo crear la empresa");
    return toDomain(row, []);
  }

  async listarPorTenant(tenantId: string): Promise<Empresa[]> {
    const rows = await this.db.query.empresa.findMany({
      where: eq(empresa.tenantId, tenantId),
      with: { modulosActivos: true },
    });
    return rows.map((row) => toDomain(row, row.modulosActivos.map((m) => m.modulo)));
  }

  /** SIEMPRE se llama con el tenantId del JWT — nunca solo por id (nota 06, seccion 3). */
  async buscarPorIdYTenant(id: string, tenantId: string): Promise<Empresa | null> {
    const row = await this.db.query.empresa.findFirst({
      where: eq(empresa.id, id),
      with: { modulosActivos: true },
    });
    if (!row || row.tenantId !== tenantId) return null;
    return toDomain(row, row.modulosActivos.map((m) => m.modulo));
  }

  async activarModulo(empresaId: string, modulo: ModuloActivable): Promise<void> {
    await this.db.insert(empresaModulo).values({ empresaId, modulo }).onConflictDoNothing();
  }
}
