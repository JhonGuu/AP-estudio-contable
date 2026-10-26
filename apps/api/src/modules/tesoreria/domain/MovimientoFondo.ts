export const TIPOS_MOVIMIENTO_FONDO = ["TRANSFERENCIA", "AJUSTE"] as const;
export type TipoMovimientoFondo = (typeof TIPOS_MOVIMIENTO_FONDO)[number];

export const TIPOS_CUENTA_FONDO = ["CAJA", "CUENTA_BANCARIA"] as const;
export type TipoCuentaFondo = (typeof TIPOS_CUENTA_FONDO)[number];

/**
 * Movimiento de tesoreria que NO viene de un comprobante de compra/venta
 * (nota 22, seccion 2 — equivalente a fnd_movimiento): transferencia entre
 * cuentas propias o ajuste manual. A diferencia de DepositarCheque, esto es
 * plenamente determinista (se conoce origen/destino de antemano) asi que
 * RegistrarMovimientoFondo arma el asiento directo (origen MANUAL) sin pasar
 * por el motor de formulas — no hay modelo_asiento_plantilla para esto.
 */
export interface NuevoMovimientoFondo {
  fecha: Date;
  tipo: TipoMovimientoFondo;
  /** TRANSFERENCIA: obligatorio. AJUSTE que solo acredita: puede omitirse. */
  cuentaOrigenTipo: TipoCuentaFondo | null;
  cuentaOrigenId: string | null;
  /** TRANSFERENCIA: obligatorio. AJUSTE que solo debita: puede omitirse. */
  cuentaDestinoTipo: TipoCuentaFondo | null;
  cuentaDestinoId: string | null;
  importe: number;
  descripcion: string;
}

export interface MovimientoFondo extends NuevoMovimientoFondo {
  id: string;
  tenantId: string;
  empresaId: string;
}

/** Una transferencia necesita origen Y destino; un ajuste necesita al menos uno de los dos. */
export function movimientoEsValido(input: NuevoMovimientoFondo): boolean {
  if (input.importe <= 0) return false;
  const tieneOrigen = input.cuentaOrigenTipo !== null && input.cuentaOrigenId !== null;
  const tieneDestino = input.cuentaDestinoTipo !== null && input.cuentaDestinoId !== null;
  if (input.tipo === "TRANSFERENCIA") return tieneOrigen && tieneDestino;
  return tieneOrigen || tieneDestino;
}
