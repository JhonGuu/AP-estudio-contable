import { pgTable, uuid, varchar, boolean, integer } from "drizzle-orm/pg-core";

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
