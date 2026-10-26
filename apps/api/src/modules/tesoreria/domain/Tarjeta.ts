/**
 * Terminal de tarjeta de credito/debito de la empresa, asociada a una cuenta
 * bancaria liquidadora (nota 22, seccion 2 — equivalente a fnd_tarjeta).
 */
export interface Tarjeta {
  id: string;
  tenantId: string;
  empresaId: string;
  nombre: string;
  cuentaLiquidadoraId: string;
  activa: boolean;
}
