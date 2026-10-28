import { eq, asc } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { usuario } from "./schema.js";
import type { Usuario } from "../domain/Usuario.js";

function toDomain(row: typeof usuario.$inferSelect): Usuario {
  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    passwordHash: row.passwordHash,
    nombre: row.nombre,
    apellido: row.apellido,
    rolGlobal: row.rolGlobal,
    estado: row.estado,
    lastLoginAt: row.lastLoginAt,
  };
}

export interface CrearUsuarioInput {
  tenantId: string;
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  rolGlobal: Usuario["rolGlobal"];
  estado?: Usuario["estado"];
}

@injectable()
export class UsuarioRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async crear(input: CrearUsuarioInput): Promise<Usuario> {
    const [row] = await this.db.insert(usuario).values(input).returning();
    if (!row) throw new Error("No se pudo crear el usuario");
    return toDomain(row);
  }

  /** Global por diseño (nota 06): el email es unico en toda la plataforma, no por tenant. */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const row = await this.db.query.usuario.findFirst({ where: eq(usuario.email, email) });
    return row ? toDomain(row) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const row = await this.db.query.usuario.findFirst({ where: eq(usuario.id, id) });
    return row ? toDomain(row) : null;
  }

  async marcarUltimoLogin(id: string, cuando: Date): Promise<void> {
    await this.db.update(usuario).set({ lastLoginAt: cuando }).where(eq(usuario.id, id));
  }

  /** Personal del estudio (nota 06) — usado para asignar tareas en el modulo "estudio". */
  async listarPorTenant(tenantId: string): Promise<Usuario[]> {
    const rows = await this.db.query.usuario.findMany({
      where: eq(usuario.tenantId, tenantId),
      orderBy: [asc(usuario.nombre), asc(usuario.apellido)],
    });
    return rows.map(toDomain);
  }
}
