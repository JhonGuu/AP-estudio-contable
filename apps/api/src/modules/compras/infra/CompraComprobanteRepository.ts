import { and, eq, gte, lte, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { compraComprobante, compraComprobanteImpuesto, compraComprobanteItem } from "./schema.js";
import type {
  ComprobanteCompra,
  ComprobanteCompraImpuestoInput,
  ComprobanteCompraItemInput,
  EstadoComprobanteCompra,
} from "../domain/ComprobanteCompra.js";

export interface CrearComprobanteCompraInput {
  tenantId: string;
  empresaId: string;
  proveedorId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  numero: number;
  fecha: Date;
  rubro: number;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  items: ComprobanteCompraItemInput[];
  impuestos: ComprobanteCompraImpuestoInput[];
}

export interface FiltrosComprobanteCompra {
  estado?: EstadoComprobanteCompra;
  proveedorId?: string;
  desde?: Date;
  hasta?: Date;
}

function toDomain(row: typeof compraComprobante.$inferSelect): ComprobanteCompra {
  return {
    id: row.id,
    tenantId: row.tenantId,
    empresaId: row.empresaId,
    proveedorId: row.proveedorId,
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
export class CompraComprobanteRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearComprobanteCompraInput): Promise<ComprobanteCompra> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(compraComprobante)
        .values({
          tenantId: input.tenantId,
          empresaId: input.empresaId,
          proveedorId: input.proveedorId,
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
      if (!row) throw new Error("No se pudo crear el comprobante de compra");

      if (input.items.length > 0) {
        await tx.insert(compraComprobanteItem).values(
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
        await tx.insert(compraComprobanteImpuesto).values(
          input.impuestos.map((impuesto) => ({
            comprobanteId: row.id,
            tipo: impuesto.tipo,
            importe: impuesto.importe.toFixed(2),
          })),
        );
      }

      return toDomain(row);
    });
  }

  async buscarPorIdYEmpresa(id: string, empresaId: string): Promise<ComprobanteCompra | null> {
    const row = await this.db.query.compraComprobante.findFirst({
      where: and(eq(compraComprobante.id, id), eq(compraComprobante.empresaId, empresaId)),
    });
    return row ? toDomain(row) : null;
  }

  async obtenerImpuestos(comprobanteId: string): Promise<ComprobanteCompraImpuestoInput[]> {
    const rows = await this.db.query.compraComprobanteImpuesto.findMany({
      where: eq(compraComprobanteImpuesto.comprobanteId, comprobanteId),
    });
    return rows.map((r) => ({ tipo: r.tipo, importe: Number(r.importe) }));
  }

  async listarPorEmpresa(empresaId: string, filtros: FiltrosComprobanteCompra): Promise<ComprobanteCompra[]> {
    const condiciones = [eq(compraComprobante.empresaId, empresaId)];
    if (filtros.estado) condiciones.push(eq(compraComprobante.estado, filtros.estado));
    if (filtros.proveedorId) condiciones.push(eq(compraComprobante.proveedorId, filtros.proveedorId));
    if (filtros.desde) condiciones.push(gte(compraComprobante.fecha, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(compraComprobante.fecha, filtros.hasta));

    const rows = await this.db.query.compraComprobante.findMany({ where: and(...condiciones) });
    return rows.map(toDomain);
  }

  async confirmar(id: string): Promise<void> {
    await this.db.update(compraComprobante).set({ estado: "CONFIRMADO" }).where(eq(compraComprobante.id, id));
  }

  /** Descuenta `importe` del saldo pendiente del comprobante (nota 08: "una factura puede cobrarse en partes"). */
  async descontarSaldo(id: string, importe: number): Promise<void> {
    await this.db
      .update(compraComprobante)
      .set({ saldoPendiente: sql`${compraComprobante.saldoPendiente} - ${importe.toFixed(2)}` })
      .where(eq(compraComprobante.id, id));
  }
}
