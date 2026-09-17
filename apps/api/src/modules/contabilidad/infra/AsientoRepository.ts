import { eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { asiento, asientoContador, asientoMovimiento } from "./schema.js";
import type { Asiento, AsientoMovimientoInput, ComprobanteOrigen, OrigenAsiento } from "../domain/Asiento.js";

export interface CrearAsientoInput {
  tenantId: string;
  empresaId: string;
  ejercicioId: string;
  fecha: Date;
  leyenda: string;
  origen: OrigenAsiento;
  comprobanteOrigen: ComprobanteOrigen | null;
  movimientos: AsientoMovimientoInput[];
}

@injectable()
export class AsientoRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearAsientoInput): Promise<Asiento> {
    return this.db.transaction(async (tx) => {
      // Numeracion atomica por empresa (mismo patron que punto_venta.ultimo_numero
      // de nota 08 seccion 2): evita el race de un SELECT MAX(numero) concurrente.
      await tx.insert(asientoContador).values({ empresaId: input.empresaId, ultimoNumero: 0 }).onConflictDoNothing();
      const [contador] = await tx
        .update(asientoContador)
        .set({ ultimoNumero: sql`${asientoContador.ultimoNumero} + 1` })
        .where(eq(asientoContador.empresaId, input.empresaId))
        .returning({ ultimoNumero: asientoContador.ultimoNumero });
      if (!contador) throw new Error("No se pudo generar el numero de asiento");

      const [asientoRow] = await tx
        .insert(asiento)
        .values({
          tenantId: input.tenantId,
          empresaId: input.empresaId,
          ejercicioId: input.ejercicioId,
          numero: contador.ultimoNumero,
          fecha: input.fecha,
          leyenda: input.leyenda,
          origen: input.origen,
          comprobanteOrigenTipo: input.comprobanteOrigen?.tipo ?? null,
          comprobanteOrigenId: input.comprobanteOrigen?.id ?? null,
        })
        .returning();
      if (!asientoRow) throw new Error("No se pudo crear el asiento");

      // nota 08 mermaid: una partida en 0 no rompe el asiento, simplemente no se persiste.
      const movimientosNoCero = input.movimientos.filter((m) => Math.abs(m.importe) > 0.005);
      if (movimientosNoCero.length > 0) {
        await tx.insert(asientoMovimiento).values(
          movimientosNoCero.map((m) => ({
            asientoId: asientoRow.id,
            cuentaId: m.cuentaId,
            lado: m.lado,
            importe: m.importe.toFixed(2),
          })),
        );
      }

      return {
        id: asientoRow.id,
        tenantId: asientoRow.tenantId,
        empresaId: asientoRow.empresaId,
        ejercicioId: asientoRow.ejercicioId,
        numero: asientoRow.numero,
        fecha: asientoRow.fecha,
        leyenda: asientoRow.leyenda,
        origen: asientoRow.origen,
        comprobanteOrigenTipo: asientoRow.comprobanteOrigenTipo,
        comprobanteOrigenId: asientoRow.comprobanteOrigenId,
        movimientos: movimientosNoCero,
      };
    });
  }
}
