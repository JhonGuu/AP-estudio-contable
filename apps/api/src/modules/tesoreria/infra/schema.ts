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
import { moneda } from "../../catalogos/infra/schema.js";
import { planCuenta, asiento } from "../../contabilidad/infra/schema.js";

export const origenChequeEnum = pgEnum("origen_cheque", ["EMITIDO", "RECIBIDO"]);
export const estadoChequeEnum = pgEnum("estado_cheque", [
  "EMITIDO",
  "RECIBIDO",
  "DEPOSITADO",
  "COBRADO",
  "RECHAZADO",
  "VENCIDO",
  "CADUCADO",
  "ANULADO",
]);
export const tipoTerceroChequeEnum = pgEnum("tipo_tercero_cheque", ["PROVEEDOR", "CLIENTE"]);
export const tipoMovimientoFondoEnum = pgEnum("tipo_movimiento_fondo", ["TRANSFERENCIA", "AJUSTE"]);
export const tipoCuentaFondoEnum = pgEnum("tipo_cuenta_fondo", ["CAJA", "CUENTA_BANCARIA"]);
export const estadoCajaDiariaEnum = pgEnum("estado_caja_diaria", ["ABIERTA", "CERRADA"]);
export const estadoConciliacionEnum = pgEnum("estado_conciliacion", ["PENDIENTE", "CONCILIADA"]);

/** Nota 22, seccion 2 — fnd_caja. cuentaContableId liga la caja a su cuenta del plan (asiento MANUAL determinista). */
export const caja = pgTable(
  "caja",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    monedaId: uuid("moneda_id")
      .notNull()
      .references(() => moneda.id, { onDelete: "restrict" }),
    cuentaContableId: uuid("cuenta_contable_id")
      .notNull()
      .references(() => planCuenta.id, { onDelete: "restrict" }),
    saldo: numeric("saldo", { precision: 15, scale: 2 }).notNull().default("0"),
    activa: boolean("activa").notNull().default(true),
  },
  (table) => [index("caja_empresa_id_idx").on(table.empresaId)],
);

/** Nota 22, seccion 2 — fnd_cuenta. */
export const cuentaBancaria = pgTable(
  "cuenta_bancaria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    cbu: varchar("cbu", { length: 22 }),
    banco: varchar("banco", { length: 100 }).notNull(),
    monedaId: uuid("moneda_id")
      .notNull()
      .references(() => moneda.id, { onDelete: "restrict" }),
    cuentaContableId: uuid("cuenta_contable_id")
      .notNull()
      .references(() => planCuenta.id, { onDelete: "restrict" }),
    saldo: numeric("saldo", { precision: 15, scale: 2 }).notNull().default("0"),
    activa: boolean("activa").notNull().default(true),
  },
  (table) => [index("cuenta_bancaria_empresa_id_idx").on(table.empresaId)],
);

/** Nota 22, seccion 2 — fnd_tarjeta. */
export const tarjeta = pgTable(
  "tarjeta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    cuentaLiquidadoraId: uuid("cuenta_liquidadora_id")
      .notNull()
      .references(() => cuentaBancaria.id, { onDelete: "restrict" }),
    activa: boolean("activa").notNull().default(true),
  },
  (table) => [index("tarjeta_empresa_id_idx").on(table.empresaId)],
);

/** Nota 22, seccion 2 — fnd_chequera. proximoNumero se incrementa atomicamente (mismo patron que comprobante_secuencia). */
export const chequera = pgTable(
  "chequera",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    cuentaBancariaId: uuid("cuenta_bancaria_id")
      .notNull()
      .references(() => cuentaBancaria.id, { onDelete: "restrict" }),
    numeroDesde: integer("numero_desde").notNull(),
    numeroHasta: integer("numero_hasta").notNull(),
    proximoNumero: integer("proximo_numero").notNull(),
    activa: boolean("activa").notNull().default(true),
  },
  (table) => [index("chequera_empresa_id_idx").on(table.empresaId)],
);

/** Nota 22, seccion 2 — fusion de fnd_cheque + fnd_cheque_3ro (misma entidad, dos nombres en Nacional Sistema). */
export const cheque = pgTable(
  "cheque",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    origen: origenChequeEnum("origen").notNull(),
    chequeraId: uuid("chequera_id").references(() => chequera.id, { onDelete: "restrict" }),
    numero: varchar("numero", { length: 30 }).notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
    fechaEmision: timestamp("fecha_emision", { withTimezone: true }).notNull(),
    fechaVencimiento: timestamp("fecha_vencimiento", { withTimezone: true }).notNull(),
    bancoEmisor: varchar("banco_emisor", { length: 100 }),
    terceroTipo: tipoTerceroChequeEnum("tercero_tipo").notNull(),
    terceroId: uuid("tercero_id").notNull(),
    cuentaBancariaId: uuid("cuenta_bancaria_id").references(() => cuentaBancaria.id, { onDelete: "restrict" }),
    estado: estadoChequeEnum("estado").notNull(),
  },
  (table) => [
    index("cheque_empresa_id_idx").on(table.empresaId),
    index("cheque_estado_idx").on(table.estado),
    uniqueIndex("cheque_chequera_numero_uk").on(table.chequeraId, table.numero),
  ],
);

/** Nota 22, seccion 2 — fnd_movimiento. */
export const movimientoFondo = pgTable(
  "movimiento_fondo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    tipo: tipoMovimientoFondoEnum("tipo").notNull(),
    cuentaOrigenTipo: tipoCuentaFondoEnum("cuenta_origen_tipo"),
    cuentaOrigenId: uuid("cuenta_origen_id"),
    cuentaDestinoTipo: tipoCuentaFondoEnum("cuenta_destino_tipo"),
    cuentaDestinoId: uuid("cuenta_destino_id"),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
    descripcion: varchar("descripcion", { length: 200 }).notNull(),
  },
  (table) => [index("movimiento_fondo_empresa_id_idx").on(table.empresaId)],
);

/**
 * Nota 22, seccion 2 — fnd_caja_diaria. Turno de una caja: apertura con el
 * saldo que tenia en ese momento, cierre con el saldo teorico (el que la
 * caja tiene en ese momento, segun todos los movimientos ya aplicados) vs.
 * el arqueo (conteo fisico). Si difieren, CerrarCajaDiaria genera un AJUSTE
 * via RegistrarMovimientoFondo (misma cuenta "Diferencias de caja y
 * valores" del fix de 2026-10-27) y guarda esa referencia en
 * `movimientoFondoId` — no hay doble contabilizacion, el arqueo reutiliza el
 * circuito de ajuste que ya existe.
 */
export const cajaDiaria = pgTable(
  "caja_diaria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    cajaId: uuid("caja_id")
      .notNull()
      .references(() => caja.id, { onDelete: "restrict" }),
    fechaApertura: timestamp("fecha_apertura", { withTimezone: true }).notNull(),
    saldoApertura: numeric("saldo_apertura", { precision: 15, scale: 2 }).notNull(),
    estado: estadoCajaDiariaEnum("estado").notNull().default("ABIERTA"),
    fechaCierre: timestamp("fecha_cierre", { withTimezone: true }),
    saldoTeorico: numeric("saldo_teorico", { precision: 15, scale: 2 }),
    totalContado: numeric("total_contado", { precision: 15, scale: 2 }),
    diferencia: numeric("diferencia", { precision: 15, scale: 2 }),
    movimientoFondoId: uuid("movimiento_fondo_id").references(() => movimientoFondo.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("caja_diaria_empresa_id_idx").on(table.empresaId),
    index("caja_diaria_caja_id_idx").on(table.cajaId),
  ],
);

/**
 * Nota 22, seccion 5 — conciliacion_bancaria. No existia en Nacional Sistema
 * (se conciliaba a mano contra el resumen bancario) — es una mejora, no una
 * migracion de dato. Cada linea es una fila del extracto importado;
 * `importe` sigue la convencion del homebanking (positivo = credito/ingreso
 * al banco, negativo = debito/egreso). El matching no se hace contra
 * `movimiento_fondo` (dejaria afuera los pagos/cobros de compras/ventas, que
 * no pasan por ese modulo) sino contra el Libro Mayor de la cuenta contable
 * de la cuenta bancaria — ahi esta today el 100% de lo que la tocó, sin
 * acoplar tesoreria a compras/ventas.
 */
export const conciliacionBancaria = pgTable(
  "conciliacion_bancaria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "restrict" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "restrict" }),
    cuentaBancariaId: uuid("cuenta_bancaria_id")
      .notNull()
      .references(() => cuentaBancaria.id, { onDelete: "restrict" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    descripcion: varchar("descripcion", { length: 300 }).notNull(),
    importe: numeric("importe", { precision: 15, scale: 2 }).notNull(),
    estado: estadoConciliacionEnum("estado").notNull().default("PENDIENTE"),
    asientoId: uuid("asiento_id").references(() => asiento.id, { onDelete: "set null" }),
  },
  (table) => [
    index("conciliacion_bancaria_empresa_id_idx").on(table.empresaId),
    index("conciliacion_bancaria_cuenta_bancaria_id_idx").on(table.cuentaBancariaId),
  ],
);

// --- relations ---

export const chequeraRelations = relations(chequera, ({ many }) => ({
  cheques: many(cheque),
}));
export const chequeRelations = relations(cheque, ({ one }) => ({
  chequera: one(chequera, { fields: [cheque.chequeraId], references: [chequera.id] }),
}));
