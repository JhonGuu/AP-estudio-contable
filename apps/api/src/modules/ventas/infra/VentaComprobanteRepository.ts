import { and, eq, gte, lte, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { ventaComprobante, ventaComprobanteImpuesto, ventaComprobanteItem, ventaComprobanteCuota } from "./schema.js";
import type {
  ComprobanteVenta,
  ComprobanteVentaCuotaInput,
  ComprobanteVentaImpuestoInput,
  ComprobanteVentaItemInput,
  EstadoComprobanteVenta,
} from "../domain/ComprobanteVenta.js";

export interface CrearComprobanteVentaInput {
  tenantId: string;
  empresaId: string;
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  numero: number;
  fecha: Date;
  rubro: number;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  items: ComprobanteVentaItemInput[];
  impuestos: ComprobanteVentaImpuestoInput[];
  cuotas: ComprobanteVentaCuotaInput[];
}

export interface FiltrosComprobanteVenta {
  estado?: EstadoComprobanteVenta;
  clienteId?: string;
  desde?: Date;
  hasta?: Date;
}

function toDomain(row: typeof ventaComprobante.$inferSelect): ComprobanteVenta {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    clienteId: row.clienteId,
    tipoComprobanteId: row.tipoComprobanteId,
    puntoVentaId: row.puntoVentaId,
    numero: row.numero,
    fecha: row.fecha,
    rubro: row.rubro,
    netoTotal: Number(row.netoTotal),
    exentoTotal: Number(row.exentoTotal),
    noGravadoTotal: Number(row.noGravadoTotal),
    importeTotal: Number(row.importeTotal),
    saldoPendiente: Number(row.saldoPendiente),
    estado: row.estado,
    cae: row.cae,
  };
}

@injectable()
export class VentaComprobanteRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearComprobanteVentaInput): Promise<ComprobanteVenta> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(ventaComprobante)
        .values({
          tenantId: input.tenantId,
          empresaId: input.empresaId,
          clienteId: input.clienteId,
          tipoComprobanteId: input.tipoComprobanteId,
          puntoVentaId: input.puntoVentaId,
          numero: input.numero,
          fecha: input.fecha,
          rubro: input.rubro,
          netoTotal: input.netoTotal.toFixed(2),
          exentoTotal: input.exentoTotal.toFixed(2),
          noGravadoTotal: input.noGravadoTotal.toFixed(2),
          importeTotal: input.importeTotal.toFixed(2),
          saldoPendiente: input.importeTotal.toFixed(2),
        })
        .returning();
      if (!row) throw new Error("No se pudo crear el comprobante de venta");

      if (input.items.length > 0) {
        await tx.insert(ventaComprobanteItem).values(
          input.items.map((item) => ({
            comprobanteId: row.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad.toFixed(3),
            precioUnitario: item.precioUnitario.toFixed(2),
            alicuotaIva: item.alicuotaIva.toFixed(2),
          })),
        );
      }
      if (input.impuestos.length > 0) {
        await tx.insert(ventaComprobanteImpuesto).values(
          input.impuestos.map((impuesto) => ({
            comprobanteId: row.id,
            tipo: impuesto.tipo,
            importe: impuesto.importe.toFixed(2),
          })),
        );
      }
      if (input.cuotas.length > 0) {
        await tx.insert(ventaComprobanteCuota).values(
          input.cuotas.map((cuota) => ({
            comprobanteId: row.id,
            numero: cuota.numero,
            fecha: cuota.fecha,
            importe: cuota.importe.toFixed(2),
            capital: cuota.capital.toFixed(2),
            interes: cuota.interes.toFixed(2),
          })),
        );
      }

      return toDomain(row);
    });
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<ComprobanteVenta | null> {
    const row = await this.db.query.ventaComprobante.findFirst({
      where: and(eq(ventaComprobante.id, id), eq(ventaComprobante.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async obtenerImpuestos(comprobanteId: string): Promise<ComprobanteVentaImpuestoInput[]> {
    const rows = await this.db.query.ventaComprobanteImpuesto.findMany({
      where: eq(ventaComprobanteImpuesto.comprobanteId, comprobanteId),
    });
    return rows.map((r) => ({ tipo: r.tipo, importe: Number(r.importe) }));
  }

  async listarPorEmpresa(empresaId: string, filtros: FiltrosComprobanteVenta): Promise<ComprobanteVenta[]> {
    const condiciones = [eq(ventaComprobante.empresaId, empresaId)];
    if (filtros.estado) condiciones.push(eq(ventaComprobante.estado, filtros.estado));
    if (filtros.clienteId) condiciones.push(eq(ventaComprobante.clienteId, filtros.clienteId));
    if (filtros.desde) condiciones.push(gte(ventaComprobante.fecha, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(ventaComprobante.fecha, filtros.hasta));

    const rows = await this.db.query.ventaComprobante.findMany({ where: and(...condiciones) });
    return rows.map(toDomain);
  }

  /**
   * Suma de `importeTotal` de comprobantes CONFIRMADO de la empresa en un
   * rango de fechas — usado por el Panel de monotributo (`estudio`) para
   * calcular la facturacion acumulada de los ultimos 12 meses sin traer cada
   * comprobante al use-case. 0 si no hay comprobantes en el rango.
   */
  async sumarImporteConfirmadoPorEmpresa(empresaId: string, desde: Date, hasta: Date): Promise<number> {
    const [fila] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${ventaComprobante.importeTotal}), 0)` })
      .from(ventaComprobante)
      .where(
        and(
          eq(ventaComprobante.empresaId, empresaId),
          eq(ventaComprobante.estado, "CONFIRMADO"),
          gte(ventaComprobante.fecha, desde),
          lte(ventaComprobante.fecha, hasta),
        ),
      );
    return Number(fila?.total ?? 0);
  }

  async confirmar(id: string): Promise<void> {
    await this.db.update(ventaComprobante).set({ estado: "CONFIRMADO" }).where(eq(ventaComprobante.id, id));
  }

  /** Descuenta `importe` del saldo pendiente del comprobante (nota 08: "una factura puede cobrarse en partes"). */
  async descontarSaldo(id: string, importe: number): Promise<void> {
    await this.db
      .update(ventaComprobante)
      .set({ saldoPendiente: sql`${ventaComprobante.saldoPendiente} - ${importe.toFixed(2)}` })
      .where(eq(ventaComprobante.id, id));
  }
}
