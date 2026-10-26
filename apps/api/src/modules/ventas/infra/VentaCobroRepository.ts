import { eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { ventaComprobante, ventaCobro, ventaCobroComprobante, ventaCobroMedio } from "./schema.js";
import type { CobroComprobanteInput, CobroMedioInput } from "../domain/Cobro.js";

export interface CrearCobroInput {
  tenantId: string;
  empresaId: string;
  clienteId: string;
  fecha: Date;
  importeTotal: number;
  medios: CobroMedioInput[];
  comprobantes: CobroComprobanteInput[];
}

export interface Cobro {
  id: string;
  tenantId: string;
  empresaId: string;
  clienteId: string;
  fecha: Date;
  importeTotal: number;
}

/**
 * Nota 08, seccion 2 (espejado de compra_pago): cobro (cabecera) + cobro_medio
 * (lineas de como se cobro) + cobro_comprobante (aplicacion contra 1+
 * facturas). Sin retenciones — esas son exclusivas de compras. Todo se
 * persiste junto con el descuento de saldo_pendiente de cada comprobante
 * aplicado, en una unica transaccion.
 */
@injectable()
export class VentaCobroRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearCobroInput): Promise<Cobro> {
    return this.db.transaction(async (tx) => {
      const [cobroRow] = await tx
        .insert(ventaCobro)
        .values({
          tenantId: input.tenantId,
          empresaId: input.empresaId,
          clienteId: input.clienteId,
          fecha: input.fecha,
          importeTotal: input.importeTotal.toFixed(2),
        })
        .returning();
      if (!cobroRow) throw new Error("No se pudo crear el cobro");

      if (input.medios.length > 0) {
        await tx.insert(ventaCobroMedio).values(
          input.medios.map((m) => ({ cobroId: cobroRow.id, medio: m.medio, importe: m.importe.toFixed(2) })),
        );
      }

      for (const aplicacion of input.comprobantes) {
        await tx.insert(ventaCobroComprobante).values({
          cobroId: cobroRow.id,
          comprobanteId: aplicacion.comprobanteId,
          importeAplicado: aplicacion.importeAplicado.toFixed(2),
        });
        await tx
          .update(ventaComprobante)
          .set({ saldoPendiente: sql`${ventaComprobante.saldoPendiente} - ${aplicacion.importeAplicado.toFixed(2)}` })
          .where(eq(ventaComprobante.id, aplicacion.comprobanteId));
      }

      return {
        id: cobroRow.id,
        tenantId: cobroRow.tenantId,
        empresaId: cobroRow.empresaId,
        clienteId: cobroRow.clienteId,
        fecha: cobroRow.fecha,
        importeTotal: Number(cobroRow.importeTotal),
      };
    });
  }
}
