import { and, asc, eq, isNotNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { conciliacionBancaria } from "./schema.js";
import type { ConciliacionBancaria, LineaExtracto } from "../domain/ConciliacionBancaria.js";

function toDomain(row: typeof conciliacionBancaria.$inferSelect): ConciliacionBancaria {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    cuentaBancariaId: row.cuentaBancariaId,
    fecha: row.fecha,
    descripcion: row.descripcion,
    importe: Number(row.importe),
    estado: row.estado,
    asientoId: row.asientoId,
  };
}

export interface NuevaLineaConciliacion extends LineaExtracto {
  tenantId: string;
  empresaId: string;
  cuentaBancariaId: string;
  /** Si el matching automatico encontro un candidato al importar, ya viene CONCILIADA. */
  asientoId: string | null;
}

@injectable()
export class ConciliacionBancariaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crearMuchas(lineas: NuevaLineaConciliacion[]): Promise<ConciliacionBancaria[]> {
    if (lineas.length === 0) return [];
    const rows = await this.db
      .insert(conciliacionBancaria)
      .values(
        lineas.map((l) => ({
          tenantId: l.tenantId,
          empresaId: l.empresaId,
          cuentaBancariaId: l.cuentaBancariaId,
          fecha: l.fecha,
          descripcion: l.descripcion,
          importe: l.importe.toFixed(2),
          estado: l.asientoId ? ("CONCILIADA" as const) : ("PENDIENTE" as const),
          asientoId: l.asientoId,
        })),
      )
      .returning();
    return rows.map(toDomain);
  }

  async listarPorCuenta(cuentaBancariaId: string, empresaId: string): Promise<ConciliacionBancaria[]> {
    const rows = await this.db.query.conciliacionBancaria.findMany({
      where: and(
        eq(conciliacionBancaria.cuentaBancariaId, cuentaBancariaId),
        eq(conciliacionBancaria.empresaId, empresaId),
      ),
      orderBy: [asc(conciliacionBancaria.fecha)],
    });
    return rows.map(toDomain);
  }

  /** Asientos ya usados como match para esta cuenta — para no reutilizarlos en otro match. */
  async listarAsientosYaConciliados(cuentaBancariaId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ asientoId: conciliacionBancaria.asientoId })
      .from(conciliacionBancaria)
      .where(
        and(eq(conciliacionBancaria.cuentaBancariaId, cuentaBancariaId), isNotNull(conciliacionBancaria.asientoId)),
      );
    return new Set(rows.map((r) => r.asientoId as string));
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<ConciliacionBancaria | null> {
    const row = await this.db.query.conciliacionBancaria.findFirst({
      where: and(eq(conciliacionBancaria.id, id), eq(conciliacionBancaria.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async marcarConciliada(id: string, asientoId: string): Promise<ConciliacionBancaria> {
    const [row] = await this.db
      .update(conciliacionBancaria)
      .set({ estado: "CONCILIADA", asientoId })
      .where(eq(conciliacionBancaria.id, id))
      .returning();
    if (!row) throw new Error("No se pudo conciliar la linea");
    return toDomain(row);
  }
}
