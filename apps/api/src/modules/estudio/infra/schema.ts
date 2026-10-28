import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenant, empresa, usuario } from "../../identidad/infra/schema.js";

// Gestion del estudio (gap nuevo, ver domain/TareaEstudio.ts) — opera a nivel
// tenant, por eso tarea_estudio referencia tenant directo y empresa_id es
// opcional (nullable = tarea interna, no de un cliente puntual).

export const estadoTareaEnum = pgEnum("estado_tarea", [
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADA",
  "CANCELADA",
]);

export const tareaEstudio = pgTable(
  "tarea_estudio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id").references(() => empresa.id, { onDelete: "restrict" }),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    descripcion: varchar("descripcion", { length: 2000 }),
    asignadoAUsuarioId: uuid("asignado_a_usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "restrict" }),
    creadoPorUsuarioId: uuid("creado_por_usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "restrict" }),
    fechaLimite: timestamp("fecha_limite", { withTimezone: true }),
    estado: estadoTareaEnum("estado").notNull().default("PENDIENTE"),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
    fechaCompletada: timestamp("fecha_completada", { withTimezone: true }),
  },
  (table) => [
    index("tarea_estudio_tenant_id_idx").on(table.tenantId),
    index("tarea_estudio_empresa_id_idx").on(table.empresaId),
    index("tarea_estudio_asignado_a_idx").on(table.asignadoAUsuarioId),
  ],
);

// --- checklist / mini-tareas dentro de una tarea ---
// (nota del gap: "mini-tareas / checklists para rutinas diarias" se modela
// como items dentro de una tarea en vez de una entidad top-level nueva —
// simplificacion deliberada de v1, ver claude/circuito-comercial-estado.md)

export const tareaEstudioItem = pgTable(
  "tarea_estudio_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tareaId: uuid("tarea_id")
      .notNull()
      .references(() => tareaEstudio.id, { onDelete: "cascade" }),
    descripcion: varchar("descripcion", { length: 200 }).notNull(),
    completado: boolean("completado").notNull().default(false),
    orden: integer("orden").notNull().default(0),
  },
  (table) => [index("tarea_estudio_item_tarea_id_idx").on(table.tareaId)],
);

// --- relations ---

export const tareaEstudioRelations = relations(tareaEstudio, ({ many }) => ({
  items: many(tareaEstudioItem),
}));

export const tareaEstudioItemRelations = relations(tareaEstudioItem, ({ one }) => ({
  tarea: one(tareaEstudio, { fields: [tareaEstudioItem.tareaId], references: [tareaEstudio.id] }),
}));

// --- calendario de vencimientos multi-cliente (ver domain/VencimientoFiscal.ts) ---
// Igual que tarea_estudio, referencia tenant directo (modulo a nivel tenant),
// pero aca empresa_id NO es nullable: todo vencimiento fiscal es de un cliente.

export const tipoVencimientoEnum = pgEnum("tipo_vencimiento", [
  "IVA",
  "GANANCIAS",
  "MONOTRIBUTO",
  "INGRESOS_BRUTOS",
  "SICORE",
  "SUELDOS",
  "OTRO",
]);

export const estadoVencimientoEnum = pgEnum("estado_vencimiento", ["PENDIENTE", "CUMPLIDO"]);

export const vencimientoFiscal = pgTable(
  "vencimiento_fiscal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    tipo: tipoVencimientoEnum("tipo").notNull(),
    descripcion: varchar("descripcion", { length: 200 }),
    periodo: varchar("periodo", { length: 20 }),
    fechaVencimiento: timestamp("fecha_vencimiento", { withTimezone: true }).notNull(),
    estado: estadoVencimientoEnum("estado").notNull().default("PENDIENTE"),
    fechaCumplido: timestamp("fecha_cumplido", { withTimezone: true }),
    asignadoAUsuarioId: uuid("asignado_a_usuario_id").references(() => usuario.id, { onDelete: "restrict" }),
    creadoPorUsuarioId: uuid("creado_por_usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "restrict" }),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vencimiento_fiscal_tenant_id_idx").on(table.tenantId),
    index("vencimiento_fiscal_empresa_id_idx").on(table.empresaId),
    index("vencimiento_fiscal_fecha_vencimiento_idx").on(table.fechaVencimiento),
    index("vencimiento_fiscal_estado_idx").on(table.estado),
  ],
);

// --- libros societarios (ver domain/LibroSocietario.ts) ---
// Misma forma que vencimiento_fiscal: referencia tenant directo, empresa_id
// NO nullable (todo libro rubricado es de una sociedad-cliente puntual).

export const tipoLibroSocietarioEnum = pgEnum("tipo_libro_societario", [
  "ACTAS_DIRECTORIO",
  "ACTAS_ASAMBLEA",
  "ACTAS_REUNION_SOCIOS_GERENCIA",
  "REGISTRO_ACCIONES",
  "DEPOSITO_ACCIONES_ASISTENCIA",
  "DIARIO",
  "INVENTARIO_Y_BALANCES",
  "OTRO",
]);

export const estadoLibroSocietarioEnum = pgEnum("estado_libro_societario", [
  "EN_USO",
  "COMPLETO",
  "EXTRAVIADO",
]);

export const libroSocietario = pgTable(
  "libro_societario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    tipo: tipoLibroSocietarioEnum("tipo").notNull(),
    numero: integer("numero").notNull(),
    cantidadFolios: integer("cantidad_folios"),
    ultimoFolioUtilizado: integer("ultimo_folio_utilizado"),
    fechaRubrica: timestamp("fecha_rubrica", { withTimezone: true }),
    ubicacion: varchar("ubicacion", { length: 200 }),
    estado: estadoLibroSocietarioEnum("estado").notNull().default("EN_USO"),
    observaciones: varchar("observaciones", { length: 2000 }),
    creadoPorUsuarioId: uuid("creado_por_usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "restrict" }),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("libro_societario_tenant_id_idx").on(table.tenantId),
    index("libro_societario_empresa_id_idx").on(table.empresaId),
    index("libro_societario_estado_idx").on(table.estado),
  ],
);
