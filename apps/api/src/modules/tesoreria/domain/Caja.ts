/**
 * Caja fisica/efectivo de la empresa (nota 22, seccion 2 — equivalente a
 * fnd_caja). `cuentaContableId` la liga a su cuenta del plan de cuentas —
 * es lo que le permite a RegistrarMovimientoFondo armar un asiento MANUAL
 * sin pasar por el motor de formulas (siempre se sabe con que cuenta debita/
 * acredita). `saldo` se mantiene actualizado de forma atomica (mismo patron
 * que comprobante.saldoPendiente) cada vez que se aplica un movimiento.
 */
export interface Caja {
  id: string;
  tenantId: string;
  empresaId: string;
  nombre: string;
  monedaId: string;
  cuentaContableId: string;
  saldo: number;
  activa: boolean;
}
