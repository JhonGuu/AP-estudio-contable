import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { cheque } from "./schema.js";
import type { Cheque, EstadoCheque, OrigenCheque, TipoTerceroCheque } from "../domain/Cheque.js";

function toDomain(row: typeof cheque.$inferSelect): Cheque {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    origen: row.origen,
    chequeraId: row.chequeraId,
    numero: row.numero,
    importe: Number(row.importe),
    fechaEmision: row.fechaEmision,
    fechaVencimiento: row.fechaVencimiento,
    bancoEmisor: row.bancoEmisor,
    terceroTipo: row.terceroTipo,
    terceroId: row.terceroId,
    cuentaBancariaId: row.cuentaBancariaId,
    estado: row.estado,
  };
}

export interface CrearChequeInput {
  tenantId: string;
  empresaId: string;
  origen: OrigenCheque;
  chequeraId?: string | null;
  numero: string;
  importe: number;
  fechaEmision: Date;
  fechaVencimiento: Date;
  bancoEmisor?: string | null;
  terceroTipo: TipoTerceroCheque;
  terceroId: string;
  estado: EstadoCheque;
}

@injectable()
export class ChequeRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearChequeInput): Promise<Cheque> {
    const [row] = await this.db
      .insert(cheque)
      .values({ ...input, importe: input.importe.toFixed(2) })
      .returning();
    if (!row) throw new Error("No se pudo crear el cheque");
    return toDomain(row);
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<Cheque | null> {
    const row = await this.db.query.cheque.findFirst({
      where: and(eq(cheque.id, id), eq(cheque.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async listarPorEmpresa(empresaId: string): Promise<Cheque[]> {
    const rows = await this.db.query.cheque.findMany({ where: eq(cheque.empresaId, empresaId) });
    return rows.map(toDomain);
  }

  /** Cambia el estado y, al depositar, fija la cuenta bancaria propia donde entro. */
  async actualizarEstado(id: string, estado: EstadoCheque, cuentaBancariaId?: string | null): Promise<Cheque> {
    const [row] = await this.db
      .update(cheque)
      .set(cuentaBancariaId !== undefined ? { estado, cuentaBancariaId } : { estado })
      .where(eq(cheque.id, id))
      .returning();
    if (!row) throw new Error("No se pudo actualizar el cheque");
    return toDomain(row);
  }
}
