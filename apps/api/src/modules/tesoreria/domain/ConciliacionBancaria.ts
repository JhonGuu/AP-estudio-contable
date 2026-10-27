export const ESTADOS_CONCILIACION = ["PENDIENTE", "CONCILIADA"] as const;
export type EstadoConciliacion = (typeof ESTADOS_CONCILIACION)[number];

/** Una linea del extracto bancario importado, antes de persistir (nota 22, seccion 5). */
export interface LineaExtracto {
  fecha: Date;
  descripcion: string;
  /** Convencion homebanking: positivo = credito/ingreso al banco, negativo = debito/egreso. */
  importe: number;
}

export interface ConciliacionBancaria extends LineaExtracto {
  id: string;
  tenantId: string;
  empresaId: string;
  cuentaBancariaId: string;
  estado: EstadoConciliacion;
  /** Asiento del Libro Mayor de la cuenta con el que se matcheo esta linea (null = pendiente). */
  asientoId: string | null;
}

/** Tolerancia de redondeo compartida con el resto del modulo contable (Asiento.estaBalanceado). */
export const EPSILON_CONCILIACION = 0.005;

/** Ventana de dias dentro de la cual una linea de extracto puede matchear un movimiento contable. */
export const VENTANA_DIAS_MATCHING = 3;
