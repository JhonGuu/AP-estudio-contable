/** Cuenta bancaria de la empresa (nota 22, seccion 2 — equivalente a fnd_cuenta). */
export interface CuentaBancaria {
  id: string;
  tenantId: string;
  empresaId: string;
  nombre: string;
  cbu: string | null;
  banco: string;
  monedaId: string;
  cuentaContableId: string;
  saldo: number;
  activa: boolean;
}
