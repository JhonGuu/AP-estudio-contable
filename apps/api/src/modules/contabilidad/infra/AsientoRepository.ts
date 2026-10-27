import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { asiento, asientoContador, asientoMovimiento } from "./schema.js";
import type { Asiento, AsientoMovimientoInput, ComprobanteOrigen, OrigenAsiento } from "../domain/Asiento.js";
import type { LadoMovimiento } from "../domain/ModeloAsiento.js";

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

/** Filtro de rango de fechas compartido por Libro Diario y Libro Mayor. */
export interface FiltrosAsiento {
  desde?: Date;
  hasta?: Date;
}

export interface MovimientoAsientoDetalle {
  cuentaId: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  lado: LadoMovimiento;
  importe: number;
}

/** Un asiento con sus movimientos resueltos (cuenta ya incluida) — para Libro Diario. */
export interface AsientoConMovimientos {
  id: string;
  numero: number;
  fecha: Date;
  leyenda: string;
  origen: OrigenAsiento;
  comprobanteOrigenTipo: string | null;
  comprobanteOrigenId: string | null;
  movimientos: MovimientoAsientoDetalle[];
}

/** Una linea de movimiento de una cuenta especifica, en orden cronologico — para Libro Mayor. */
export interface MovimientoMayor {
  asientoId: string;
  asientoNumero: number;
  fecha: Date;
  leyenda: string;
  lado: LadoMovimiento;
  importe: number;
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

  /** Libro Diario (nota 11 cnt_asiento/cnt_movimiento): todos los asientos de la empresa, con sus movimientos y la cuenta ya resuelta, en orden cronologico. */
  async listarPorEmpresa(empresaId: string, filtros: FiltrosAsiento = {}): Promise<AsientoConMovimientos[]> {
    const condiciones = [eq(asiento.empresaId, empresaId)];
    if (filtros.desde) condiciones.push(gte(asiento.fecha, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(asiento.fecha, filtros.hasta));

    const rows = await this.db.query.asiento.findMany({
      where: and(...condiciones),
      with: { movimientos: { with: { cuenta: true } } },
      orderBy: (a, { asc: ascOrder }) => [ascOrder(a.fecha), ascOrder(a.numero)],
    });

    return rows.map((r) => ({
      id: r.id,
      numero: r.numero,
      fecha: r.fecha,
      leyenda: r.leyenda,
      origen: r.origen,
      comprobanteOrigenTipo: r.comprobanteOrigenTipo,
      comprobanteOrigenId: r.comprobanteOrigenId,
      movimientos: r.movimientos.map((m) => ({
        cuentaId: m.cuentaId,
        cuentaCodigo: m.cuenta.codigo,
        cuentaNombre: m.cuenta.nombre,
        lado: m.lado,
        importe: Number(m.importe),
      })),
    }));
  }

  /** Libro Mayor de una cuenta (nota 11 cnt_movimiento filtrado por cuenta): movimientos de esa cuenta en orden cronologico, base para calcular saldo acumulado. */
  async listarMovimientosPorCuenta(
    empresaId: string,
    cuentaId: string,
    filtros: FiltrosAsiento = {},
  ): Promise<MovimientoMayor[]> {
    const condiciones = [eq(asiento.empresaId, empresaId), eq(asientoMovimiento.cuentaId, cuentaId)];
    if (filtros.desde) condiciones.push(gte(asiento.fecha, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(asiento.fecha, filtros.hasta));

    const rows = await this.db
      .select({
        asientoId: asiento.id,
        asientoNumero: asiento.numero,
        fecha: asiento.fecha,
        leyenda: asiento.leyenda,
        lado: asientoMovimiento.lado,
        importe: asientoMovimiento.importe,
      })
      .from(asientoMovimiento)
      .innerJoin(asiento, eq(asientoMovimiento.asientoId, asiento.id))
      .where(and(...condiciones))
      .orderBy(asc(asiento.fecha), asc(asiento.numero));

    return rows.map((r) => ({ ...r, importe: Number(r.importe) }));
  }
}
