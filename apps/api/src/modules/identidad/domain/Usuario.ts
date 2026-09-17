import type { RolEmpresa, RolGlobal } from "./roles.js";

export const ESTADOS_USUARIO = ["ACTIVO", "INVITADO_PENDIENTE", "DESHABILITADO"] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

export interface Usuario {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  rolGlobal: RolGlobal;
  estado: EstadoUsuario;
  lastLoginAt: Date | null;
}

/** Vista publica del usuario — nunca incluye passwordHash. */
export type UsuarioPublico = Omit<Usuario, "passwordHash">;

export function toUsuarioPublico(usuario: Usuario): UsuarioPublico {
  const { passwordHash: _passwordHash, ...publico } = usuario;
  return publico;
}

export interface UsuarioEmpresa {
  usuarioId: string;
  empresaId: string;
  rol: RolEmpresa;
}
