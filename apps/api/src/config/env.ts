import "dotenv/config";
import { z } from "zod";

/**
 * Todas las variables de entorno pasan por Zod antes de que el resto del
 * proceso las toque: si falta o esta mal tipada una, el servidor no arranca
 * (falla rapido, en vez de fallar a medias en el primer request que la use).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET debe tener al menos 16 caracteres"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET debe tener al menos 16 caracteres"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  MASTER_ENCRYPTION_KEY: z.string().min(32, "MASTER_ENCRYPTION_KEY debe tener al menos 32 caracteres"),

  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Variables de entorno invalidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Configuracion de entorno invalida — revisar .env contra .env.example");
  }
  return parsed.data;
}

export const env = loadEnv();
