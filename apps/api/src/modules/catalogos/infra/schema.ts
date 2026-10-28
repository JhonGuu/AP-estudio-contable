import { pgTable, uuid, varchar, boolean, integer, numeric } from "drizzle-orm/pg-core";

/**
 * Catalogos globales (equivalentes a los `bas_*` de Nacional Sistema — nota 01,
 * nota 25 seccion 3): sin tenant_id/empresa_id, se cargan una sola vez por
 * ambiente via el script de seed (pnpm db:seed), antes de poder dar de alta
 * la primera empresa.
 */

export const moneda = pgTable("moneda", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 3 }).notNull().unique(), // ISO 4217, ej. ARS, USD
  nombre: varchar("nombre", { length: 50 }).notNull(),
  simbolo: varchar("simbolo", { length: 5 }).notNull(),
});

export const provincia = pgTable("provincia", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigoAfip: varchar("codigo_afip", { length: 2 }).notNull().unique(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
});

export const condicionIva = pgTable("condicion_iva", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigoAfip: varchar("codigo_afip", { length: 4 }).notNull().unique(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  esResponsableInscripto: boolean("es_responsable_inscripto").notNull().default(false),
});

export const tipoDocumento = pgTable("tipo_documento", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigoAfip: varchar("codigo_afip", { length: 3 }).notNull().unique(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  longitud: integer("longitud"), // ej. CUIT = 11, DNI = 7-8; null si es variable
});

/**
 * Categorias del regimen de Monotributo (A..K) — usado por el "Panel de
 * monotributo" del modulo `estudio` (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * `topeAnualFacturacion` son los valores vigentes desde el 1/08/2026
 * (actualizacion semestral de ARCA, proxima esperada ~febrero 2027) —
 * ANTES DE USAR EN PRODUCCION, verificar contra la tabla oficial vigente en
 * https://www.arca.gob.ar. `soloVentaBienes`: las categorias I/J/K solo
 * estan disponibles para monotributistas de venta de cosas muebles — un
 * prestador de servicios tiene su techo en H. El panel no valida esto de
 * forma estricta (requeriria clasificar la actividad de cada empresa, fuera
 * de alcance de v1); el frontend solo lo muestra como nota informativa.
 */
export const categoriaMonotributo = pgTable("categoria_monotributo", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 2 }).notNull().unique(), // "A".."K"
  orden: integer("orden").notNull(),
  topeAnualFacturacion: numeric("tope_anual_facturacion", { precision: 15, scale: 2 }).notNull(),
  soloVentaBienes: boolean("solo_venta_bienes").notNull().default(false),
});
