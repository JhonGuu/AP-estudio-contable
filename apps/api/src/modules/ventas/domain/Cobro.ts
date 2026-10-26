export const MEDIOS_COBRO = ["CAJA", "CUENTA_BANCARIA", "TARJETA", "CHEQUE_PROPIO", "CHEQUE_TERCERO"] as const;
export type MedioCobro = (typeof MEDIOS_COBRO)[number];

export interface CobroMedioInput {
  medio: MedioCobro;
  importe: number;
}

export interface CobroComprobanteInput {
  comprobanteId: string;
  importeAplicado: number;
}

/** A diferencia de compras, cobro NO lleva retenciones (nota 08, seccion 2: "retencion — Solo compras"). */
export interface NuevoCobro {
  clienteId: string;
  fecha: Date;
  importeTotal: number;
  medios: CobroMedioInput[];
  comprobantes: CobroComprobanteInput[];
}

const EPSILON = 0.005;

/** Nota 08, seccion 3 (espejado): "RegistrarCobro valida Σ medios == importe cobrado". */
export function mediosCoincidenConTotal(input: NuevoCobro): boolean {
  const totalMedios = input.medios.reduce((acc, m) => acc + m.importe, 0);
  return Math.abs(totalMedios - input.importeTotal) <= EPSILON;
}

/** La aplicacion contra comprobantes tiene que agotar el importe total del cobro. */
export function aplicacionCoincideConTotal(input: NuevoCobro): boolean {
  const totalAplicado = input.comprobantes.reduce((acc, c) => acc + c.importeAplicado, 0);
  return Math.abs(totalAplicado - input.importeTotal) <= EPSILON;
}
