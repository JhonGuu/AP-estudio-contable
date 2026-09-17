import "reflect-metadata";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { pool } from "./shared/db/client.js";

async function main() {
  const container = buildContainer();
  const app = buildApp(container);

  const server = app.listen(env.PORT, () => {
    logger.info(`AP-Contadores API escuchando en :${env.PORT} (${env.NODE_ENV})`);
  });

  async function shutdown(signal: string) {
    logger.info(`${signal} recibido, cerrando...`);
    server.close(() => {
      logger.info("Servidor HTTP cerrado");
    });
    await pool.end();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Error fatal al arrancar el servidor:", error);
  process.exit(1);
});
