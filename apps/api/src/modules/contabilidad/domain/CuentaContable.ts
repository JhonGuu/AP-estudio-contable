export const TIPOS_CUENTA = ["ACTIVO", "PASIVO", "PATRIMONIO_NETO", "RESULTADO"] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

/** Plan de cuentas jerarquico de la empresa (nota 07, seccion 2). */
export interface CuentaContable {
  id: string;
  tenantId: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  imputable: boolean;
}
