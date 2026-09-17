import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

/**
 * Aplica las migraciones versionadas de ./drizzle (generadas con `pnpm db:generate`).
 * Nunca se edita el schema de la base a mano — nota 25, seccion 2.
 */
async function main() {
  // eslint-disable-next-line no-console
  console.log("Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  // eslint-disable-next-line no-console
  console.log("Migraciones aplicadas.");
  await pool.end();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error aplicando migraciones:", error);
  process.exit(1);
});
