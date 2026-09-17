export const MEDIOS_PAGO = ["CAJA", "CUENTA_BANCARIA", "TARJETA", "CHEQUE_PROPIO", "CHEQUE_TERCERO"] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const TIPOS_RETENCION = ["IIBB", "GANANCIAS", "IVA"] as const;
export type TipoRetencion = (typeof TIPOS_RETENCION)[number];

export interface PagoMedioInput {
  medio: MedioPago;
  importe: number;
}

export interface PagoComprobanteInput {
  comprobanteId: string;
  importeAplicado: number;
}

export interface RetencionInput {
  tipo: TipoRetencion;
  importe: number;
}

export interface NuevoPago {
  proveedorId: string;
  fecha: Date;
  importeTotal: number;
  medios: PagoMedioInput[];
  comprobantes: PagoComprobanteInput[];
  retenciones: RetencionInput[];
}

const EPSILON = 0.005;

/**
 * Nota 08, seccion 3: "RegistrarPago valida Σ medios == importe pagado".
 * Las retenciones se restan del efectivo pagado (nota 08, seccion 6: "v1
 * permite cargar la retencion a mano en el pago") — lo que efectivamente
 * cancela comprobantes es medios + retenciones.
 */
export function mediosCoincidenConTotal(input: NuevoPago): boolean {
  const totalMedios = input.medios.reduce((acc, m) => acc + m.importe, 0);
  const totalRetenciones = input.retenciones.reduce((acc, r) => acc + r.importe, 0);
  return Math.abs(totalMedios + totalRetenciones - input.importeTotal) <= EPSILON;
}

/** La aplicacion contra comprobantes tiene que agotar el importe total del pago. */
export function aplicacionCoincideConTotal(input: NuevoPago): boolean {
  const totalAplicado = input.comprobantes.reduce((acc, c) => acc + c.importeAplicado, 0);
  return Math.abs(totalAplicado - input.importeTotal) <= EPSILON;
}
