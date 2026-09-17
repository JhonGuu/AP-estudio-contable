import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no esta definida (copiar .env.example a .env)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/**/infra/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
