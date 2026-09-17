import { boolean, index, integer, pgEnum, pgTable, primaryKey, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { empresa, tenant } from "../../identidad/infra/schema.js";

export const aplicaAEnum = pgEnum("aplica_a_comprobante", ["COMPRA", "VENTA", "AMBOS"]);

/**
 * Catalogo global (nota 08, seccion 2): unifica cmp_tipo_comprobante (18
 * tipos) y vta_tipo_comprobante (12 tipos) de Nacional Sistema en una sola
 * tabla con un flag aplica_a. Sin tenant_id/empresa_id — se carga una sola
 * vez por ambiente via el seed (nota 25, seccion 3).
 */
export const tipoComprobante = pgTable("tipo_comprobante", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 10 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  aplicaA: aplicaAEnum("aplica_a").notNull(),
  afectaIva: boolean("afecta_iva").notNull().default(false),
  afectaCuentaCorriente: boolean("afecta_cuenta_corriente").notNull().default(true),
  requiereCae: boolean("requiere_cae").notNull().default(false),
});

/** Punto de venta / talonario de la empresa (nota 08, seccion 2). */
export const puntoVenta = pgTable(
  "punto_venta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    numero: integer("numero").notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    index("punto_venta_empresa_id_idx").on(table.empresaId),
    uniqueIndex("punto_venta_empresa_numero_uk").on(table.empresaId, table.numero),
  ],
);

/**
 * Contador de "ultimo comprobante emitido por tipo" (nota 08, seccion 2) —
 * una fila por (punto_venta, tipo_comprobante), incrementada atomicamente via
 * UPDATE...RETURNING (mismo patron que asiento_contador de contabilidad) para
 * no depender de un SELECT MAX(numero) concurrente.
 */
export const comprobanteSecuencia = pgTable(
  "comprobante_secuencia",
  {
    puntoVentaId: uuid("punto_venta_id")
      .notNull()
      .references(() => puntoVenta.id, { onDelete: "restrict" }),
    tipoComprobanteId: uuid("tipo_comprobante_id")
      .notNull()
      .references(() => tipoComprobante.id, { onDelete: "restrict" }),
    ultimoNumero: integer("ultimo_numero").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.puntoVentaId, table.tipoComprobanteId] })],
);
