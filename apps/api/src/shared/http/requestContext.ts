import type { RolGlobal, RolEmpresa } from "../../modules/identidad/domain/roles.js";

/**
 * Contexto de request armado en dos pasos por los middlewares de identidad
 * (nota 06, seccion 3):
 *   1. authMiddleware valida el JWT y setea usuarioId + tenantId + rolGlobal.
 *   2. empresaContextMiddleware (solo en rutas de modulos de negocio) valida
 *      X-Empresa-Id contra usuario_empresa + empresa.tenant_id y agrega
 *      empresaId + rol.
 * Todo repositorio de un modulo de negocio recibe este contexto y SIEMPRE
 * filtra por tenantId + empresaId — nunca una query sin los dos.
 */
export interface AuthContext {
  usuarioId: string;
  tenantId: string;
  rolGlobal: RolGlobal;
}

export interface EmpresaContext extends AuthContext {
  empresaId: string;
  rol: RolEmpresa;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
    context?: EmpresaContext;
  }
}
