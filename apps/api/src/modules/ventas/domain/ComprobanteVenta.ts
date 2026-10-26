export const ESTADOS_COMPROBANTE_VENTA = ["BORRADOR", "CONFIRMADO", "ANULADO"] as const;
export type EstadoComprobanteVenta = (typeof ESTADOS_COMPROBANTE_VENTA)[number];

export const TIPOS_IMPUESTO_COMPROBANTE_VENTA = ["IVA", "IIBB", "OTROS"] as const;
export type TipoImpuestoComprobanteVenta = (typeof TIPOS_IMPUESTO_COMPROBANTE_VENTA)[number];

export interface ComprobanteVentaItemInput {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  alicuotaIva: number;
}

export interface ComprobanteVentaImpuestoInput {
  tipo: TipoImpuestoComprobanteVenta;
  importe: number;
}

/** Nota 08, seccion 2: "comprobante_cuota — solo ventas: plan de cuotas de una factura". Es seguimiento/cobranza, no alimenta el asiento (el asiento se genera entero al confirmar, antes de que exista ningun cobro). */
export interface ComprobanteVentaCuotaInput {
  numero: number;
  fecha: Date;
  importe: number;
  capital: number;
  interes: number;
}

export interface NuevoComprobanteVenta {
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: Date;
  rubro: number;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  items: ComprobanteVentaItemInput[];
  impuestos: ComprobanteVentaImpuestoInput[];
  cuotas: ComprobanteVentaCuotaInput[];
}

const EPSILON = 0.005;

/** Nota 08, seccion 4 (flowchart, espejado a ventas): "¿Neto + IVA + otros == Total?" — se rechaza sin grabar nada si no cierra. */
export function totalesCoinciden(input: NuevoComprobanteVenta): boolean {
  const totalImpuestos = input.impuestos.reduce((acc, i) => acc + i.importe, 0);
  const calculado = input.netoTotal + input.exentoTotal + input.noGravadoTotal + totalImpuestos;
  return Math.abs(calculado - input.importeTotal) <= EPSILON;
}

export function sumaImpuestoPorTipo(
  impuestos: ComprobanteVentaImpuestoInput[],
  tipo: TipoImpuestoComprobanteVenta,
): number {
  return impuestos.filter((i) => i.tipo === tipo).reduce((acc, i) => acc + i.importe, 0);
}

export interface ComprobanteVenta {
  id: string;
  tenantId: string;
  empresaId: string;
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  numero: number;
  fecha: Date;
  rubro: number;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  saldoPendiente: number;
  estado: EstadoComprobanteVenta;
  cae: string | null;
}

/** Solo un comprobante BORRADOR puede confirmarse (nota 08, seccion 4). */
export function puedeConfirmarse(comprobante: Pick<ComprobanteVenta, "estado">): boolean {
  return comprobante.estado === "BORRADOR";
}
