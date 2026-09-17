import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { comprobanteSecuencia } from "./schema.js";

/**
 * Numeracion atomica de comprobantes por (punto de venta, tipo) — nota 08,
 * seccion 2: "punto_venta: numero AFIP, ultimo comprobante emitido por tipo".
 * UPDATE...RETURNING sobre una fila dedicada, sin SELECT MAX concurrente
 * (mismo patron que asiento_contador de contabilidad).
 */
@injectable()
export class ComprobanteSecuenciaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async siguienteNumero(puntoVentaId: string, tipoComprobanteId: string): Promise<number> {
    await this.db
      .insert(comprobanteSecuencia)
      .values({ puntoVentaId, tipoComprobanteId, ultimoNumero: 0 })
      .onConflictDoNothing();

    const [row] = await this.db
      .update(comprobanteSecuencia)
      .set({ ultimoNumero: sql`${comprobanteSecuencia.ultimoNumero} + 1` })
      .where(
        and(
          eq(comprobanteSecuencia.puntoVentaId, puntoVentaId),
          eq(comprobanteSecuencia.tipoComprobanteId, tipoComprobanteId),
        ),
      )
      .returning({ ultimoNumero: comprobanteSecuencia.ultimoNumero });

    if (!row) throw new Error("No se pudo generar el numero de comprobante");
    return row.ultimoNumero;
  }
}
