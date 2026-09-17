/**
 * Eventos de negocio que disparan un asiento automatico (nota 07, seccion 2 —
 * "8 modelos" documentados en nota 21; v1 implementa los 4 que alimenta el
 * circuito comercial: ASIENTO_COMPRA/ASIENTO_VENTA/COBRO_ASIENTO/PAGO_ASIENTO.
 * DEPOSITO y SUELDOS quedan listados para cuando se construyan tesoreria y
 * el add-on de sueldos, sin modelo_asiento_plantilla todavia.
 */
export const EVENTOS_MODELO_ASIENTO = [
  "ASIENTO_COMPRA",
  "ASIENTO_VENTA",
  "COBRO_ASIENTO",
  "PAGO_ASIENTO",
  "DEPOSITO",
  "SUELDOS",
] as const;
export type EventoModeloAsiento = (typeof EVENTOS_MODELO_ASIENTO)[number];

export const LADOS_MOVIMIENTO = ["DEBE", "HABER"] as const;
export type LadoMovimiento = (typeof LADOS_MOVIMIENTO)[number];

export interface ModeloAsientoMovimiento {
  id: string;
  orden: number;
  cuentaId: string;
  cuentaCodigo: string;
  lado: LadoMovimiento;
  formula: string;
}

/** Copia editable por empresa de una modelo_asiento_plantilla (nota 07, seccion 2). */
export interface ModeloAsiento {
  id: string;
  tenantId: string;
  empresaId: string;
  evento: EventoModeloAsiento;
  nombre: string;
  activo: boolean;
  movimientos: ModeloAsientoMovimiento[];
}
