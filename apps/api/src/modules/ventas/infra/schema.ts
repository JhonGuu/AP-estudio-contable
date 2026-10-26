import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { empresa, tenant } from "../../identidad/infra/schema.js";
import { condicionIva } from "../../catalogos/infra/schema.js";
import { puntoVenta, tipoComprobante } from "../../comprobantes/infra/schema.js";

export const estadoComprobanteVentaEnum = pgEnum("estado_comprobante_venta", [
  "BORRADOR",
  "CONFIRMADO",
  "ANULADO",
]);
export const tipoImpuestoVentaEnum = pgEnum("tipo_impuesto_venta", ["IVA", "IIBB", "OTROS"]);
export const medioCobroEnum = pgEnum("medio_cobro", [
  "CAJA",
  "CUENTA_BANCARIA",
  "TARJETA",
  "CHEQUE_PROPIO",
  "CHEQUE_TERCERO",
]);

/** Cliente de la empresa-cliente (nota 08, seccion 2 — mismo esqueleto que proveedor). */
export const cliente = pgTable(
  "cliente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    razonSocial: varchar("razon_social", { length: 150 }).notNull(),
    cuit: varchar("cuit", { length: 13 }).notNull(),
    condicionIvaId: uuid("condicion_iva_id")
      .notNull()
      .references(() => condicionIva.id, { onDelete: "restrict" }),
    domicilio: varchar("domicilio", { length: 200 }),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [
    index("cliente_empresa_id_idx").on(table.empresaId),
    uniqueIndex("cliente_empresa_cuit_uk").on(table.empresaId, table.cuit),
  ],
);

export const ventaComprobante = pgTable(
  "venta_comprobante",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "restrict" }),
    tipoComprobanteId: uuid("tipo_comprobante_id")
      .notNull()
      .references(() => tipoComprobante.id, { onDelete: "restrict" }),
    puntoVentaId: uuid("punto_venta_id")
      .notNull()
      .references(() => puntoVenta.id, { onDelete: "restrict" }),
    numero: integer("numero").notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    rubro: integer("rubro").notNull().default(1),
    netoTotal: numeric("neto_total", { precision: 15, scale: 2 }).notNull(),
    exentoTotal: numeric("exento_total", { precision: 15, scale: 2 }).notNull().default("0"),
    noGravadoTotal: numeric("no_gravado_total", { precision: 15, scale: 2 }).notNull().default("0"),
    importeTotal: numeric("importe_total", { precision: 15, scale: 2 }).notNull(),
    saldoPendiente: numeric("saldo_pendiente", { precision: 15, scale: 2 }).notNull(),
    estado: estadoComprobanteVentaEnum("estado").notNull().default("BORRADOR"),
    cae: varchar("cae", { length: 20 }),
  },
  (table) => [
    index("venta_comprobante_empresa_id_idx").on(table.empresaId),
    index("venta_comprobante_cliente_id_idx").on(table.clienteId),
    uniqueIndex("venta_comprobante_empresa_tipo_pv_numero_uk").on(
      table.empresaId,
      table.tipoComprobanteId,
      table.puntoVentaId,
      table.numero,
    ),
  ],
);

export const ventaComprobanteItem = pgTable(
  "venta_comprobante_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => ventaComprobante.id, { onDelete: "cascade" }),
    descripcion: varchar("descripcion", { length: 200 }).notNull(),
    cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
    precioUnitario: numeric("precio_unitario", { precision: 15, scale: 2 }).notNull(),
    alicuotaIva: numeric("alicuota_iva", { precision: 5, scale: 2 }).notNull().default("21"),
  },
  (table) => [index("venta_comprobante_item_comprobante_id_idx").on(table.comprobanteId)],
);

export const ventaComprobanteImpuesto = pgTable(
  "venta_comprobante_impuesto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => ventaComprobante.id, { onDelete: "cascade" }),
    tipo: tipoImpuestoVentaEnum("tipo").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("venta_comprobante_impuesto_comprobante_id_idx").on(table.comprobanteId)],
);

/** Nota 08, seccion 2: "comprobante_cuota — solo ventas: plan de cuotas de una factura (fecha, importe, capital/interes)". Seguimiento de cobranza, no alimenta el asiento. */
export const ventaComprobanteCuota = pgTable(
  "venta_comprobante_cuota",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => ventaComprobante.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
    capital: numeric("capital", { precision: 15, scale: 2 }).notNull(),
    interes: numeric("interes", { precision: 15, scale: 2 }).notNull().default("0"),
  },
  (table) => [
    index("venta_comprobante_cuota_comprobante_id_idx").on(table.comprobanteId),
    uniqueIndex("venta_comprobante_cuota_comprobante_numero_uk").on(table.comprobanteId, table.numero),
  ],
);

export const ventaCobro = pgTable(
  "venta_cobro",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "restrict" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    importeTotal: numeric("importe_total", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("venta_cobro_empresa_id_idx").on(table.empresaId)],
);

export const ventaCobroMedio = pgTable(
  "venta_cobro_medio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cobroId: uuid("cobro_id")
      .notNull()
      .references(() => ventaCobro.id, { onDelete: "cascade" }),
    medio: medioCobroEnum("medio").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("venta_cobro_medio_cobro_id_idx").on(table.cobroId)],
);

export const ventaCobroComprobante = pgTable(
  "venta_cobro_comprobante",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cobroId: uuid("cobro_id")
      .notNull()
      .references(() => ventaCobro.id, { onDelete: "cascade" }),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => ventaComprobante.id, { onDelete: "restrict" }),
    importeAplicado: numeric("importe_aplicado", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("venta_cobro_comprobante_cobro_id_idx").on(table.cobroId)],
);

// --- relations ---

export const ventaComprobanteRelations = relations(ventaComprobante, ({ many }) => ({
  items: many(ventaComprobanteItem),
  impuestos: many(ventaComprobanteImpuesto),
  cuotas: many(ventaComprobanteCuota),
}));
export const ventaComprobanteItemRelations = relations(ventaComprobanteItem, ({ one }) => ({
  comprobante: one(ventaComprobante, {
    fields: [ventaComprobanteItem.comprobanteId],
    references: [ventaComprobante.id],
  }),
}));
export const ventaComprobanteImpuestoRelations = relations(ventaComprobanteImpuesto, ({ one }) => ({
  comprobante: one(ventaComprobante, {
    fields: [ventaComprobanteImpuesto.comprobanteId],
    references: [ventaComprobante.id],
  }),
}));
export const ventaComprobanteCuotaRelations = relations(ventaComprobanteCuota, ({ one }) => ({
  comprobante: one(ventaComprobante, {
    fields: [ventaComprobanteCuota.comprobanteId],
    references: [ventaComprobante.id],
  }),
}));
export const ventaCobroRelations = relations(ventaCobro, ({ many }) => ({
  medios: many(ventaCobroMedio),
  comprobantes: many(ventaCobroComprobante),
}));
export const ventaCobroMedioRelations = relations(ventaCobroMedio, ({ one }) => ({
  cobro: one(ventaCobro, { fields: [ventaCobroMedio.cobroId], references: [ventaCobro.id] }),
}));
export const ventaCobroComprobanteRelations = relations(ventaCobroComprobante, ({ one }) => ({
  cobro: one(ventaCobro, { fields: [ventaCobroComprobante.cobroId], references: [ventaCobro.id] }),
  comprobante: one(ventaComprobante, {
    fields: [ventaCobroComprobante.comprobanteId],
    references: [ventaComprobante.id],
  }),
}));
