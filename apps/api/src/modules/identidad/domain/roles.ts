/** Rol por defecto del usuario dentro de su tenant (nota 06, tabla `usuario`). */
export const ROLES_GLOBALES = ["OWNER", "ADMIN", "CONTADOR", "ASISTENTE"] as const;
export type RolGlobal = (typeof ROLES_GLOBALES)[number];

/** Rol especifico por empresa, puede diferir del rol global (tabla `usuario_empresa`). */
export const ROLES_EMPRESA = ["OWNER", "ADMIN", "CONTADOR", "ASISTENTE", "SOLO_LECTURA"] as const;
export type RolEmpresa = (typeof ROLES_EMPRESA)[number];

export const ROLES_CON_ALTA_EMPRESA: readonly RolGlobal[] = ["OWNER", "ADMIN"];
