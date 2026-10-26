import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../../config/env.js";
import * as identidadSchema from "../../modules/identidad/infra/schema.js";
import * as catalogosSchema from "../../modules/catalogos/infra/schema.js";
import * as contabilidadSchema from "../../modules/contabilidad/infra/schema.js";
import * as comprobantesSchema from "../../modules/comprobantes/infra/schema.js";
import * as comprasSchema from "../../modules/compras/infra/schema.js";
import * as ventasSchema from "../../modules/ventas/infra/schema.js";
import * as tesoreriaSchema from "../../modules/tesoreria/infra/schema.js";

/**
 * Un unico pool de conexiones para todo el proceso. Todos los schemas de
 * modulo se agregan aca a medida que se van construyendo (contabilidad,
 * compras, ventas, fiscal, tesoreria, stock, sueldos) — Drizzle los necesita
 * juntos para el query builder relacional y para que `drizzle-kit generate`
 * vea todas las tablas de una.
 */
export const schema = {
  ...identidadSchema,
  ...catalogosSchema,
  ...contabilidadSchema,
  ...comprobantesSchema,
  ...comprasSchema,
  ...ventasSchema,
  ...tesoreriaSchema,
};

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
