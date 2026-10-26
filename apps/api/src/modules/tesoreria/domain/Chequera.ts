/**
 * Talonario de cheques propios de una cuenta bancaria (nota 22, seccion 2 —
 * equivalente a fnd_chequera). `proximoNumero` se incrementa de forma atomica
 * (mismo patron que comprobante_secuencia.ultimo_numero) cada vez que se
 * emite un cheque propio nuevo.
 */
export interface Chequera {
  id: string;
  tenantId: string;
  empresaId: string;
  cuentaBancariaId: string;
  numeroDesde: number;
  numeroHasta: number;
  proximoNumero: number;
  activa: boolean;
}
