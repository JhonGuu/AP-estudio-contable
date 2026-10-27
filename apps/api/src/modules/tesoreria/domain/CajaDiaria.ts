export const ESTADOS_CAJA_DIARIA = ["ABIERTA", "CERRADA"] as const;
export type EstadoCajaDiaria = (typeof ESTADOS_CAJA_DIARIA)[number];

/**
 * Turno de una caja (nota 22, seccion 2 — equivalente a fnd_caja_diaria).
 * Se abre con el saldo que la caja tiene en ese momento (`saldoApertura`) y
 * se cierra pidiendo el conteo fisico (`totalContado`) contra el saldo
 * teorico que la caja tiene en el momento del cierre (`saldoTeorico` — ya
 * actualizado en tiempo real por cada pago/cobro/movimiento de fondo, no
 * hace falta reconstruirlo). Si difieren, `CerrarCajaDiaria` genera un
 * AJUSTE de fondo con la contrapartida "Diferencias de caja y valores" y
 * referencia ese movimiento en `movimientoFondoId`.
 */
export interface CajaDiaria {
  id: string;
  tenantId: string;
  empresaId: string;
  cajaId: string;
  fechaApertura: Date;
  saldoApertura: number;
  estado: EstadoCajaDiaria;
  fechaCierre: Date | null;
  saldoTeorico: number | null;
  totalContado: number | null;
  diferencia: number | null;
  movimientoFondoId: string | null;
}
