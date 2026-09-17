import { eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { compraComprobante, compraPago, compraPagoComprobante, compraPagoMedio, compraRetencion } from "./schema.js";
import type { PagoComprobanteInput, PagoMedioInput, RetencionInput } from "../domain/Pago.js";

export interface CrearPagoInput {
  tenantId: string;
  empresaId: string;
  proveedorId: string;
  fecha: Date;
  importeTotal: number;
  medios: PagoMedioInput[];
  comprobantes: PagoComprobanteInput[];
  retenciones: RetencionInput[];
}

export interface Pago {
  id: string;
  tenantId: string;
  empresaId: string;
  proveedorId: string;
  fecha: Date;
  importeTotal: number;
}

/**
 * Nota 08, seccion 2: pago (cabecera) + pago_medio (lineas de como se pagó) +
 * pago_comprobante (aplicacion contra 1+ facturas) + retencion (manual, nota
 * 08 seccion 6). Todo se persiste junto con el descuento de saldo_pendiente
 * de cada comprobante aplicado, en una unica transaccion.
 */
@injectable()
export class CompraPagoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearPagoInput): Promise<Pago> {
    return this.db.transaction(async (tx) => {
      const [pagoRow] = await tx
        .insert(compraPago)
        .values({
          tenantId: input.tenantId,
          empresaId: input.empresaId,
          proveedorId: input.proveedorId,
          fecha: input.fecha,
          importeTotal: input.importeTotal.toFixed(2),
        })
        .returning();
      if (!pagoRow) throw new Error("No se pudo crear el pago");

      if (input.medios.length > 0) {
        await tx.insert(compraPagoMedio).values(
          input.medios.map((m) => ({ pagoId: pagoRow.id, medio: m.medio, importe: m.importe.toFixed(2) })),
        );
      }

      if (input.retenciones.length > 0) {
        await tx.insert(compraRetencion).values(
          input.retenciones.map((r) => ({ pagoId: pagoRow.id, tipo: r.tipo, importe: r.importe.toFixed(2) })),
        );
      }

      for (const aplicacion of input.comprobantes) {
        await tx.insert(compraPagoComprobante).values({
          pagoId: pagoRow.id,
          comprobanteId: aplicacion.comprobanteId,
          importeAplicado: aplicacion.importeAplicado.toFixed(2),
        });
        await tx
          .update(compraComprobante)
          .set({ saldoPendiente: sql`${compraComprobante.saldoPendiente} - ${aplicacion.importeAplicado.toFixed(2)}` })
          .where(eq(compraComprobante.id, aplicacion.comprobanteId));
      }

      return {
        id: pagoRow.id,
        tenantId: pagoRow.tenantId,
        empresaId: pagoRow.empresaId,
        proveedorId: pagoRow.proveedorId,
        fecha: pagoRow.fecha,
        importeTotal: Number(pagoRow.importeTotal),
      };
    });
  }
}
