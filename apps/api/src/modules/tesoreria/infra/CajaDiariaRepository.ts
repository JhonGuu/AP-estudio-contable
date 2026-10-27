import { and, desc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { cajaDiaria } from "./schema.js";
import type { CajaDiaria } from "../domain/CajaDiaria.js";

function toDomain(row: typeof cajaDiaria.$inferSelect): CajaDiaria {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    cajaId: row.cajaId,
    fechaApertura: row.fechaApertura,
    saldoApertura: Number(row.saldoApertura),
    estado: row.estado,
    fechaCierre: row.fechaCierre,
    saldoTeorico: row.saldoTeorico === null ? null : Number(row.saldoTeorico),
    totalContado: row.totalContado === null ? null : Number(row.totalContado),
    diferencia: row.diferencia === null ? null : Number(row.diferencia),
    movimientoFondoId: row.movimientoFondoId,
  };
}

export interface AbrirCajaDiariaInput {
  tenantId: string;
  empresaId: string;
  cajaId: string;
  fechaApertura: Date;
  saldoApertura: number;
}

export interface CerrarCajaDiariaInput {
  fechaCierre: Date;
  saldoTeorico: number;
  totalContado: number;
  diferencia: number;
  movimientoFondoId: string | null;
}

@injectable()
export class CajaDiariaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: AbrirCajaDiariaInput): Promise<CajaDiaria> {
    const [row] = await this.db
      .insert(cajaDiaria)
      .values({
        tenantId: input.tenantId,
        empresaId: input.empresaId,
        cajaId: input.cajaId,
        fechaApertura: input.fechaApertura,
        saldoApertura: input.saldoApertura.toFixed(2),
        estado: "ABIERTA",
      })
      .returning();
    if (!row) throw new Error("No se pudo abrir la caja diaria");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<CajaDiaria | null> {
    const row = await this.db.query.cajaDiaria.findFirst({
      where: and(eq(cajaDiaria.id, id), eq(cajaDiaria.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  /** Una caja no puede tener dos turnos ABIERTA al mismo tiempo. */
  async buscarAbiertaPorCaja(cajaId: string): Promise<CajaDiaria | null> {
    const row = await this.db.query.cajaDiaria.findFirst({
      where: and(eq(cajaDiaria.cajaId, cajaId), eq(cajaDiaria.estado, "ABIERTA")),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string, cajaId?: string): Promise<CajaDiaria[]> {
    const condiciones = [eq(cajaDiaria.empresaId, empresaId)];
    if (cajaId) condiciones.push(eq(cajaDiaria.cajaId, cajaId));
    const rows = await this.db.query.cajaDiaria.findMany({
      where: and(...condiciones),
      orderBy: [desc(cajaDiaria.fechaApertura)],
    });
    return rows.map(toDomain);
  }

  async cerrar(id: string, input: CerrarCajaDiariaInput): Promise<CajaDiaria> {
    const [row] = await this.db
      .update(cajaDiaria)
      .set({
        estado: "CERRADA",
        fechaCierre: input.fechaCierre,
        saldoTeorico: input.saldoTeorico.toFixed(2),
        totalContado: input.totalContado.toFixed(2),
        diferencia: input.diferencia.toFixed(2),
        movimientoFondoId: input.movimientoFondoId,
      })
      .where(eq(cajaDiaria.id, id))
      .returning();
    if (!row) throw new Error("No se pudo cerrar la caja diaria");
    return toDomain(row);
  }
}

