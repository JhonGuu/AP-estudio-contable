export const APLICA_A_VALUES = ["COMPRA", "VENTA", "AMBOS"] as const;
export type AplicaA = (typeof APLICA_A_VALUES)[number];

/**
 * Catalogo global unificado (nota 08, seccion 2): cmp_tipo_comprobante (18
 * tipos) + vta_tipo_comprobante (12 tipos) de Nacional Sistema, casi
 * identicos, se unifican en un solo catalogo con un flag aplica_a.
 */
export interface TipoComprobante {
  id: string;
  codigo: string; // FA, FB, FC, FE, NC, ND, REM, etc.
  nombre: string;
  aplicaA: AplicaA;
  afectaIva: boolean;
  afectaCuentaCorriente: boolean;
  requiereCae: boolean;
}
