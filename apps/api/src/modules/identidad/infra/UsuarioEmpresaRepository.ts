import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Database } from "../../../shared/db/client.js";
import { TYPES } from "../../../types.js";
import { empresa, usuarioEmpresa } from "./schema.js";
import type { RolEmpresa } from "../domain/roles.js";

export interface AccesoEmpresa {
  empresaId: string;
  rol: RolEmpresa;
  empresaTenantId: string;
}

@injectable()
export class UsuarioEmpresaRepository {
  constructor(@inject(TYPES.Database) private readonly db: Database) {}

  async asignar(usuarioId: string, empresaId: string, rol: RolEmpresa): Promise<void> {
    await this.db
      .insert(usuarioEmpresa)
      .values({ usuarioId, empresaId, rol })
      .onConflictDoUpdate({ target: [usuarioEmpresa.usuarioId, usuarioEmpresa.empresaId], set: { rol } });
  }

  /**
   * El chequeo de doble validacion de nota 06 seccion 3, punto 3: confirma que
   * (usuarioId, empresaId) existe en usuario_empresa Y devuelve el tenant_id
   * real de esa empresa para que empresaContextMiddleware lo compare contra
   * el tenantId del JWT antes de armar el contexto.
   */
  async buscarAcceso(usuarioId: string, empresaId: string): Promise<AccesoEmpresa | null> {
    const row = await this.db
      .select({ rol: usuarioEmpresa.rol, empresaTenantId: empresa.tenantId })
      .from(usuarioEmpresa)
      .innerJoin(empresa, eq(empresa.id, usuarioEmpresa.empresaId))
      .where(and(eq(usuarioEmpresa.usuarioId, usuarioId), eq(usuarioEmpresa.empresaId, empresaId)))
      .limit(1);

    const found = row[0];
    if (!found) return null;
    return { empresaId, rol: found.rol, empresaTenantId: found.empresaTenantId };
  }

  async listarEmpresasDeUsuario(usuarioId: string): Promise<AccesoEmpresa[]> {
    const rows = await this.db
      .select({ empresaId: usuarioEmpresa.empresaId, rol: usuarioEmpresa.rol, empresaTenantId: empresa.tenantId })
      .from(usuarioEmpresa)
      .innerJoin(empresa, eq(empresa.id, usuarioEmpresa.empresaId))
      .where(eq(usuarioEmpresa.usuarioId, usuarioId));
    return rows;
  }
}
