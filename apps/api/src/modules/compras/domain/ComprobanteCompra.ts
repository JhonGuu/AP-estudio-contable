export const ESTADOS_COMPROBANTE_COMPRA = ["BORRADOR", "CONFIRMADO", "ANULADO"] as const;
export type EstadoComprobanteCompra = (typeof ESTADOS_COMPROBANTE_COMPRA)[number];

export const TIPOS_IMPUESTO_COMPROBANTE = ["IVA", "IIBB", "OTROS"] as const;
export type TipoImpuestoComprobante = (typeof TIPOS_IMPUESTO_COMPROBANTE)[number];

export interface ComprobanteCompraItemInput {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  alicuotaIva: number;
}

export interface ComprobanteCompraImpuestoInput {
  tipo: TipoImpuestoComprobante;
  importe: number;
}

export interface NuevoComprobanteCompra {
  proveedorId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: Date;
  /** Variable RUBRO del motor de asientos (nota 07) — v1 negocios de un solo rubro, default 1. */
  rubro: number;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  items: ComprobanteCompraItemInput[];
  impuestos: ComprobanteCompraImpuestoInput[];
}

const EPSILON = 0.005;

/**
 * Nota 08, seccion 4 (flowchart): "¿Neto + IVA + otros == Total?" — se
 * rechaza sin grabar nada si no cierra.
 */
export function totalesCoinciden(input: NuevoComprobanteCompra): boolean {
  const totalImpuestos = input.impuestos.reduce((acc, i) => acc + i.importe, 0);
  const calculado = input.netoTotal + input.exentoTotal + input.noGravadoTotal + totalImpuestos;
  return Math.abs(calculado - input.importeTotal) <= EPSILON;
}

export function sumaImpuestoPorTipo(
  impuestos: ComprobanteCompraImpuestoInput[],
  tipo: TipoImpuestoComprobante,
): number {
  return impuestos.filter((i) => i.tipo === tipo).reduce((acc, i) => acc + i.importe, 0);
}

export interface ComprobanteCompra {
  id: string;
  tenantId: string;
  empresaId: string;
  proveedorId: string;
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
  estado: EstadoComprobanteCompra;
  cae: string | null;
}

/** Solo un comprobante BORRADOR puede confirmarse (nota 08, seccion 4). */
export function puedeConfirmarse(comprobante: Pick<ComprobanteCompra, "estado">): boolean {
  return comprobante.estado === "BORRADOR";
}
