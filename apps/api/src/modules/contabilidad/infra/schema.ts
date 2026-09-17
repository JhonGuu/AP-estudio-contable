import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { empresa, tenant } from "../../identidad/infra/schema.js";

export const tipoCuentaEnum = pgEnum("tipo_cuenta", ["ACTIVO", "PASIVO", "PATRIMONIO_NETO", "RESULTADO"]);
export const eventoModeloAsientoEnum = pgEnum("evento_modelo_asiento", [
  "ASIENTO_COMPRA",
  "ASIENTO_VENTA",
  "COBRO_ASIENTO",
  "PAGO_ASIENTO",
  "DEPOSITO",
  "SUELDOS",
]);
export const ladoMovimientoEnum = pgEnum("lado_movimiento", ["DEBE", "HABER"]);
export const origenAsientoEnum = pgEnum("origen_asiento", ["AUTOMATICO", "MANUAL"]);

// --- plan de cuentas (nota 07, seccion 2) ---

export const planCuenta = pgTable(
  "plan_cuenta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    codigo: varchar("codigo", { length: 20 }).notNull(),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    tipo: tipoCuentaEnum("tipo").notNull(),
    imputable: boolean("imputable").notNull().default(true),
  },
  (table) => [
    index("plan_cuenta_empresa_id_idx").on(table.empresaId),
    uniqueIndex("plan_cuenta_empresa_codigo_uk").on(table.empresaId, table.codigo),
  ],
);

// --- ejercicio contable (nota 06 cierre_ejercicio + nota 07 seccion 2) ---

export const ejercicio = pgTable(
  "ejercicio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    fechaDesde: date("fecha_desde", { mode: "string" }).notNull(),
    fechaHasta: date("fecha_hasta", { mode: "string" }).notNull(),
    cerrado: boolean("cerrado").notNull().default(false),
  },
  (table) => [
    index("ejercicio_empresa_id_idx").on(table.empresaId),
    uniqueIndex("ejercicio_empresa_desde_uk").on(table.empresaId, table.fechaDesde),
  ],
);

// --- contador de numeracion de asientos por empresa (evita SELECT MAX concurrente) ---

export const asientoContador = pgTable("asiento_contador", {
  empresaId: uuid("empresa_id")
    .primaryKey()
    .references(() => empresa.id, { onDelete: "restrict" }),
  ultimoNumero: integer("ultimo_numero").notNull().default(0),
});

// --- asiento ---

export const asiento = pgTable(
  "asiento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    ejercicioId: uuid("ejercicio_id")
      .notNull()
      .references(() => ejercicio.id, { onDelete: "restrict" }),
    numero: integer("numero").notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    leyenda: varchar("leyenda", { length: 255 }).notNull(),
    origen: origenAsientoEnum("origen").notNull().default("AUTOMATICO"),
    comprobanteOrigenTipo: varchar("comprobante_origen_tipo", { length: 30 }),
    comprobanteOrigenId: uuid("comprobante_origen_id"),
  },
  (table) => [
    index("asiento_empresa_id_idx").on(table.empresaId),
    uniqueIndex("asiento_empresa_numero_uk").on(table.empresaId, table.numero),
  ],
);

export const asientoMovimiento = pgTable(
  "asiento_movimiento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asientoId: uuid("asiento_id")
      .notNull()
      .references(() => asiento.id, { onDelete: "cascade" }),
    cuentaId: uuid("cuenta_id")
      .notNull()
      .references(() => planCuenta.id, { onDelete: "restrict" }),
    lado: ladoMovimientoEnum("lado").notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [index("asiento_movimiento_asiento_id_idx").on(table.asientoId)],
);

// --- modelo_asiento_plantilla (global, "de fabrica" — nota 07 seccion 2) ---

export const modeloAsientoPlantilla = pgTable("modelo_asiento_plantilla", {
  id: uuid("id").primaryKey().defaultRandom(),
  evento: eventoModeloAsientoEnum("evento").notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  activo: boolean("activo").notNull().default(true),
});

export const modeloAsientoPlantillaMovimiento = pgTable("modelo_asiento_plantilla_movimiento", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantillaId: uuid("plantilla_id")
    .notNull()
    .references(() => modeloAsientoPlantilla.id, { onDelete: "cascade" }),
  orden: integer("orden").notNull(),
  cuentaCodigo: varchar("cuenta_codigo", { length: 20 }).notNull(),
  lado: ladoMovimientoEnum("lado").notNull(),
  formula: text("formula").notNull(),
});

// --- modelo_asiento (copia editable por empresa — nota 07 seccion 2) ---

export const modeloAsiento = pgTable(
  "modelo_asiento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    evento: eventoModeloAsientoEnum("evento").notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    activo: boolean("activo").notNull().default(true),
  },
  (table) => [uniqueIndex("modelo_asiento_empresa_evento_uk").on(table.empresaId, table.evento)],
);

export const modeloAsientoMovimiento = pgTable("modelo_asiento_movimiento", {
  id: uuid("id").primaryKey().defaultRandom(),
  modeloAsientoId: uuid("modelo_asiento_id")
    .notNull()
    .references(() => modeloAsiento.id, { onDelete: "cascade" }),
  orden: integer("orden").notNull(),
  cuentaId: uuid("cuenta_id")
    .notNull()
    .references(() => planCuenta.id, { onDelete: "restrict" }),
  lado: ladoMovimientoEnum("lado").notNull(),
  formula: text("formula").notNull(),
});

// --- relations ---

export const modeloAsientoRelations = relations(modeloAsiento, ({ many }) => ({
  movimientos: many(modeloAsientoMovimiento),
}));
export const modeloAsientoMovimientoRelations = relations(modeloAsientoMovimiento, ({ one }) => ({
  modeloAsiento: one(modeloAsiento, {
    fields: [modeloAsientoMovimiento.modeloAsientoId],
    references: [modeloAsiento.id],
  }),
  cuenta: one(planCuenta, { fields: [modeloAsientoMovimiento.cuentaId], references: [planCuenta.id] }),
}));
export const asientoRelations = relations(asiento, ({ many }) => ({
  movimientos: many(asientoMovimiento),
}));
export const asientoMovimientoRelations = relations(asientoMovimiento, ({ one }) => ({
  asiento: one(asiento, { fields: [asientoMovimiento.asientoId], references: [asiento.id] }),
  cuenta: one(planCuenta, { fields: [asientoMovimiento.cuentaId], references: [planCuenta.id] }),
}));
export const modeloAsientoPlantillaRelations = relations(modeloAsientoPlantilla, ({ many }) => ({
  movimientos: many(modeloAsientoPlantillaMovimiento),
}));
export const modeloAsientoPlantillaMovimientoRelations = relations(
  modeloAsientoPlantillaMovimiento,
  ({ one }) => ({
    plantilla: one(modeloAsientoPlantilla, {
      fields: [modeloAsientoPlantillaMovimiento.plantillaId],
      references: [modeloAsientoPlantilla.id],
    }),
  }),
);
