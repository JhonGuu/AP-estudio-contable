import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { condicionIva, moneda, provincia } from "../../catalogos/infra/schema.js";

// --- enums --- (nota 06)

export const planTenantEnum = pgEnum("plan_tenant", ["TRIAL", "BASICO", "PROFESIONAL"]);
export const estadoTenantEnum = pgEnum("estado_tenant", ["ACTIVO", "SUSPENDIDO", "CANCELADO"]);
export const estadoEmpresaEnum = pgEnum("estado_empresa", ["ACTIVO", "INACTIVO"]);
export const rolGlobalEnum = pgEnum("rol_global", ["OWNER", "ADMIN", "CONTADOR", "ASISTENTE"]);
export const estadoUsuarioEnum = pgEnum("estado_usuario", [
  "ACTIVO",
  "INVITADO_PENDIENTE",
  "DESHABILITADO",
]);
export const rolEmpresaEnum = pgEnum("rol_empresa", [
  "OWNER",
  "ADMIN",
  "CONTADOR",
  "ASISTENTE",
  "SOLO_LECTURA",
]);
export const moduloActivableEnum = pgEnum("modulo_activable", ["STOCK", "SUELDOS"]);

// --- tenant --- (nota 06, "el estudio contable que paga la suscripcion")

export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  razonSocial: varchar("razon_social", { length: 150 }).notNull(),
  cuit: varchar("cuit", { length: 13 }).notNull().unique(),
  emailContacto: varchar("email_contacto", { length: 150 }).notNull(),
  plan: planTenantEnum("plan").notNull().default("TRIAL"),
  estado: estadoTenantEnum("estado").notNull().default("ACTIVO"),
  fechaAlta: timestamp("fecha_alta", { withTimezone: true }).notNull().defaultNow(),
  fechaBaja: timestamp("fecha_baja", { withTimezone: true }),
});

// --- empresa --- (nota 06, "cliente del estudio, con su propia contabilidad")

export const empresa = pgTable(
  "empresa",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    razonSocial: varchar("razon_social", { length: 150 }).notNull(),
    nombreComercial: varchar("nombre_comercial", { length: 150 }),
    cuit: varchar("cuit", { length: 13 }).notNull(),
    condicionIvaId: uuid("condicion_iva_id")
      .notNull()
      .references(() => condicionIva.id, { onDelete: "restrict" }),
    domicilioFiscal: varchar("domicilio_fiscal", { length: 200 }).notNull(),
    provinciaId: uuid("provincia_id")
      .notNull()
      .references(() => provincia.id, { onDelete: "restrict" }),
    actividadAfip: varchar("actividad_afip", { length: 10 }).notNull(),
    monedaBaseId: uuid("moneda_base_id")
      .notNull()
      .references(() => moneda.id, { onDelete: "restrict" }),
    cierreEjercicio: varchar("cierre_ejercicio", { length: 5 }).notNull(), // "MM-DD"
    estado: estadoEmpresaEnum("estado").notNull().default("ACTIVO"),
  },
  (table) => [
    index("empresa_tenant_id_idx").on(table.tenantId),
    // CUIT unico solo mientras esta ACTIVO (nota 06): si el estudio pierde un
    // cliente y otro estudio lo toma despues, el registro viejo (INACTIVO) no bloquea.
    uniqueIndex("empresa_cuit_activo_uk")
      .on(table.cuit)
      .where(sql`${table.estado} = 'ACTIVO'`),
  ],
);

// --- modulos activos por empresa (add-ons opcionales — notas 23/24) ---

export const empresaModulo = pgTable(
  "empresa_modulo",
  {
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    modulo: moduloActivableEnum("modulo").notNull(),
    activadoEn: timestamp("activado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.empresaId, table.modulo] })],
);

// --- usuario --- (nota 06, "persona que inicia sesion")

export const usuario = pgTable(
  "usuario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    // Unico a nivel de toda la plataforma (nota 06, decision abierta: una
    // persona con dos estudios distintos usa dos cuentas separadas por ahora).
    email: varchar("email", { length: 150 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    apellido: varchar("apellido", { length: 100 }).notNull(),
    rolGlobal: rolGlobalEnum("rol_global").notNull().default("ASISTENTE"),
    estado: estadoUsuarioEnum("estado").notNull().default("INVITADO_PENDIENTE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [index("usuario_tenant_id_idx").on(table.tenantId)],
);

// --- usuario_empresa --- (nota 06, "a que empresas del tenant puede acceder cada usuario")

export const usuarioEmpresa = pgTable(
  "usuario_empresa",
  {
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    rol: rolEmpresaEnum("rol").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.usuarioId, table.empresaId] }),
    index("usuario_empresa_empresa_id_idx").on(table.empresaId),
  ],
);

// --- relations (para el query builder relacional de Drizzle) ---

export const tenantRelations = relations(tenant, ({ many }) => ({
  empresas: many(empresa),
  usuarios: many(usuario),
}));

export const empresaRelations = relations(empresa, ({ one, many }) => ({
  tenant: one(tenant, { fields: [empresa.tenantId], references: [tenant.id] }),
  condicionIva: one(condicionIva, { fields: [empresa.condicionIvaId], references: [condicionIva.id] }),
  provincia: one(provincia, { fields: [empresa.provinciaId], references: [provincia.id] }),
  monedaBase: one(moneda, { fields: [empresa.monedaBaseId], references: [moneda.id] }),
  modulosActivos: many(empresaModulo),
  usuarios: many(usuarioEmpresa),
}));

export const empresaModuloRelations = relations(empresaModulo, ({ one }) => ({
  empresa: one(empresa, { fields: [empresaModulo.empresaId], references: [empresa.id] }),
}));

export const usuarioRelations = relations(usuario, ({ one, many }) => ({
  tenant: one(tenant, { fields: [usuario.tenantId], references: [tenant.id] }),
  empresas: many(usuarioEmpresa),
}));

export const usuarioEmpresaRelations = relations(usuarioEmpresa, ({ one }) => ({
  usuario: one(usuario, { fields: [usuarioEmpresa.usuarioId], references: [usuario.id] }),
  empresa: one(empresa, { fields: [usuarioEmpresa.empresaId], references: [empresa.id] }),
}));
