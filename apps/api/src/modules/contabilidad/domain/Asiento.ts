import type { LadoMovimiento } from "./ModeloAsiento.js";

export const ORIGENES_ASIENTO = ["AUTOMATICO", "MANUAL"] as const;
export type OrigenAsiento = (typeof ORIGENES_ASIENTO)[number];

export interface AsientoMovimientoInput {
  cuentaId: string;
  cuentaCodigo: string;
  lado: LadoMovimiento;
  importe: number;
}

export interface ComprobanteOrigen {
  tipo: string; // "compra" | "venta" | "pago" | "cobro"
  id: string;
}

export interface Asiento {
  id: string;
  tenantId: string;
  empresaId: string;
  ejercicioId: string;
  numero: number;
  fecha: Date;
  leyenda: string;
  origen: OrigenAsiento;
  comprobanteOrigenTipo: string | null;
  comprobanteOrigenId: string | null;
  movimientos: AsientoMovimientoInput[];
}

const EPSILON = 0.005; // tolerancia de redondeo a centavos

export function sumaLado(movimientos: AsientoMovimientoInput[], lado: LadoMovimiento): number {
  return movimientos.filter((m) => m.lado === lado).reduce((acc, m) => acc + m.importe, 0);
}

/**
 * Nota 07, punto 5: Σ DEBE == Σ HABER. Esta es la validacion que reemplaza
 * cualquier chequeo que hiciera Java del lado de Nacional Sistema — aca se
 * hace explicita y bloqueante: si un modelo mal configurado no cierra, el
 * asiento nunca se graba a medias (ver GenerarAsientoDesdeComprobante).
 */
export function estaBalanceado(movimientos: AsientoMovimientoInput[]): boolean {
  return Math.abs(sumaLado(movimientos, "DEBE") - sumaLado(movimientos, "HABER")) <= EPSILON;
}
