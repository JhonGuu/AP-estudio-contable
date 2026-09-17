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

export const estadoComprobanteCompraEnum = pgEnum("estado_comprobante_compra", [
  "BORRADOR",
  "CONFIRMADO",
  "ANULADO",
]);
export const tipoImpuestoCompraEnum = pgEnum("tipo_impuesto_compra", ["IVA", "IIBB", "OTROS"]);
export const medioPagoEnum = pgEnum("medio_pago", [
  "CAJA",
  "CUENTA_BANCARIA",
  "TARJETA",
  "CHEQUE_PROPIO",
  "CHEQUE_TERCERO",
]);
export const tipoRetencionEnum = pgEnum("tipo_retencion", ["IIBB", "GANANCIAS", "IVA"]);

/** Proveedor de la empresa-cliente (nota 08, seccion 2 — cmp_proveedor recortado). */
export const proveedor = pgTable(
  "proveedor",
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
    index("proveedor_empresa_id_idx").on(table.empresaId),
    uniqueIndex("proveedor_empresa_cuit_uk").on(table.empresaId, table.cuit),
  ],
);

export const compraComprobante = pgTable(
  "compra_comprobante",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    proveedorId: uuid("proveedor_id")
      .notNull()
      .references(() => proveedor.id, { onDelete: "restrict" }),
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
    estado: estadoComprobanteCompraEnum("estado").notNull().default("BORRADOR"),
    cae: varchar("cae", { length: 20 }),
  },
  (table) => [
    index("compra_comprobante_empresa_id_idx").on(table.empresaId),
    index("compra_comprobante_proveedor_id_idx").on(table.proveedorId),
    uniqueIndex("compra_comprobante_empresa_tipo_pv_numero_uk").on(
      table.empresaId,
      table.tipoComprobanteId,
      table.puntoVentaId,
      table.numero,
    ),
  ],
);

export const compraComprobanteItem = pgTable(
  "compra_comprobante_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => compraComprobante.id, { onDelete: "cascade" }),
    descripcion: varchar("descripcion", { length: 200 }).notNull(),
    cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
    precioUnitario: numeric("precio_unitario", { precision: 15, scale: 2 }).notNull(),
    alicuotaIva: numeric("alicuota_iva", { precision: 5, scale: 2 }).notNull().default("21"),
  },
  (table) => [index("compra_comprobante_item_comprobante_id_idx").on(table.comprobanteId)],
);

export const compraComprobanteImpuesto = pgTable(
  "compra_comprobante_impuesto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => compraComprobante.id, { onDelete: "cascade" }),
    tipo: tipoImpuestoCompraEnum("tipo").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("compra_comprobante_impuesto_comprobante_id_idx").on(table.comprobanteId)],
);

export const compraPago = pgTable(
  "compra_pago",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    proveedorId: uuid("proveedor_id")
      .notNull()
      .references(() => proveedor.id, { onDelete: "restrict" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    importeTotal: numeric("importe_total", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("compra_pago_empresa_id_idx").on(table.empresaId)],
);

export const compraPagoMedio = pgTable(
  "compra_pago_medio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pagoId: uuid("pago_id")
      .notNull()
      .references(() => compraPago.id, { onDelete: "cascade" }),
    medio: medioPagoEnum("medio").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("compra_pago_medio_pago_id_idx").on(table.pagoId)],
);

export const compraPagoComprobante = pgTable(
  "compra_pago_comprobante",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pagoId: uuid("pago_id")
      .notNull()
      .references(() => compraPago.id, { onDelete: "cascade" }),
    comprobanteId: uuid("comprobante_id")
      .notNull()
      .references(() => compraComprobante.id, { onDelete: "restrict" }),
    importeAplicado: numeric("importe_aplicado", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("compra_pago_comprobante_pago_id_idx").on(table.pagoId)],
);

export const compraRetencion = pgTable(
  "compra_retencion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pagoId: uuid("pago_id")
      .notNull()
      .references(() => compraPago.id, { onDelete: "cascade" }),
    tipo: tipoRetencionEnum("tipo").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("compra_retencion_pago_id_idx").on(table.pagoId)],
);

// --- relations ---

export const compraComprobanteRelations = relations(compraComprobante, ({ many }) => ({
  items: many(compraComprobanteItem),
  impuestos: many(compraComprobanteImpuesto),
}));
export const compraComprobanteItemRelations = relations(compraComprobanteItem, ({ one }) => ({
  comprobante: one(compraComprobante, {
    fields: [compraComprobanteItem.comprobanteId],
    references: [compraComprobante.id],
  }),
}));
export const compraComprobanteImpuestoRelations = relations(compraComprobanteImpuesto, ({ one }) => ({
  comprobante: one(compraComprobante, {
    fields: [compraComprobanteImpuesto.comprobanteId],
    references: [compraComprobante.id],
  }),
}));
export const compraPagoRelations = relations(compraPago, ({ many }) => ({
  medios: many(compraPagoMedio),
  comprobantes: many(compraPagoComprobante),
  retenciones: many(compraRetencion),
}));
export const compraPagoMedioRelations = relations(compraPagoMedio, ({ one }) => ({
  pago: one(compraPago, { fields: [compraPagoMedio.pagoId], references: [compraPago.id] }),
}));
export const compraPagoComprobanteRelations = relations(compraPagoComprobante, ({ one }) => ({
  pago: one(compraPago, { fields: [compraPagoComprobante.pagoId], references: [compraPago.id] }),
  comprobante: one(compraComprobante, {
    fields: [compraPagoComprobante.comprobanteId],
    references: [compraComprobante.id],
  }),
}));
export const compraRetencionRelations = relations(compraRetencion, ({ one }) => ({
  pago: one(compraPago, { fields: [compraRetencion.pagoId], references: [compraPago.id] }),
}));
