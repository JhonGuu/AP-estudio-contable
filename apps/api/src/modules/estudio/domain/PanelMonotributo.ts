/**
 * Panel de monotributo (gap nuevo — ver
 * `claude/modulos-nacional-sistema-y-gap-estudio-contable.md`, seccion 3,
 * "Panel de monotributo"). Tercera pieza de "Gestion del estudio".
 *
 * A diferencia de TareaEstudio y VencimientoFiscal, esto no es una entidad
 * con tabla propia: es una VISTA calculada sobre datos que ya existen —
 * `empresa.categoriaMonotributoId` (autodeclarada, agregada en el modulo
 * `identidad`) y la facturacion CONFIRMADO de `ventas` de los ultimos 12
 * meses (acumulado movil, igual a como AFIP/ARCA evalua la recategorizacion
 * real). No hay tabla `panel_monotributo` ni historial — cada vez que se
 * pide el panel, se recalcula.
 */
export const ESTADOS_MONOTRIBUTO = ["SIN_CATEGORIZAR", "OK", "ALERTA", "EXCEDIDO"] as const;
export type EstadoMonotributo = (typeof ESTADOS_MONOTRIBUTO)[number];

/** A partir de este porcentaje del tope de su categoria, se alerta para recategorizar. */
export const UMBRAL_ALERTA_MONOTRIBUTO = 0.8;

export interface ItemPanelMonotributo {
  empresaId: string;
  razonSocial: string;
  categoriaMonotributoId: string | null;
  /** Facturacion CONFIRMADO acumulada de los ultimos 12 meses (movil, no año calendario). */
  facturacionAcumulada: number;
  /** Tope anual de la categoria declarada; null si no hay categoria cargada. */
  topeCategoria: number | null;
  /** facturacionAcumulada / topeCategoria; null si no hay categoria cargada. */
  porcentajeTope: number | null;
  estado: EstadoMonotributo;
}

export function calcularEstadoMonotributo(facturacionAcumulada: number, topeCategoria: number | null): EstadoMonotributo {
  if (topeCategoria === null) return "SIN_CATEGORIZAR";
  const porcentaje = facturacionAcumulada / topeCategoria;
  if (porcentaje > 1) return "EXCEDIDO";
  if (porcentaje >= UMBRAL_ALERTA_MONOTRIBUTO) return "ALERTA";
  return "OK";
}
