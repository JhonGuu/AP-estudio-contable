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
