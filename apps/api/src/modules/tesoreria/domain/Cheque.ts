export const ORIGENES_CHEQUE = ["EMITIDO", "RECIBIDO"] as const;
export type OrigenCheque = (typeof ORIGENES_CHEQUE)[number];

/**
 * Nota 22, seccion 2: "unifica propio y de tercero en una sola tabla con
 * origen (EMITIDO|RECIBIDO) y tercero_id generico". El ciclo de vida completo
 * documentado es "EMITIDO → ENDOSADO/DEPOSITADO → COBRADO, con RECHAZADO/
 * VENCIDO/CADUCADO/ANULADO como finales alternativos" — v1 no implementa
 * ENDOSADO (endosar un cheque de tercero para pagarle a otro proveedor):
 * queda documentado como limitacion conocida, no silenciosa (un intento de
 * transicion a un estado no soportado se rechaza explicitamente, ver mas
 * abajo), igual que TARJETA/CHEQUE_PROPIO en compras/ventas.
 */
export const ESTADOS_CHEQUE = [
  "EMITIDO",
  "RECIBIDO",
  "DEPOSITADO",
  "COBRADO",
  "RECHAZADO",
  "VENCIDO",
  "CADUCADO",
  "ANULADO",
] as const;
export type EstadoCheque = (typeof ESTADOS_CHEQUE)[number];

export const TIPOS_TERCERO_CHEQUE = ["PROVEEDOR", "CLIENTE"] as const;
export type TipoTerceroCheque = (typeof TIPOS_TERCERO_CHEQUE)[number];

export interface Cheque {
  id: string;
  tenantId: string;
  empresaId: string;
  origen: OrigenCheque;
  /** Solo para origen EMITIDO — de que chequera propia sale. */
  chequeraId: string | null;
  numero: string;
  importe: number;
  fechaEmision: Date;
  fechaVencimiento: Date;
  /** Banco del tercero — relevante sobre todo para RECIBIDO. */
  bancoEmisor: string | null;
  /**
   * A quien se le paga (EMITIDO, terceroTipo=PROVEEDOR) o quien nos paga
   * (RECIBIDO, terceroTipo=CLIENTE). Referencia generica sin FK entre
   * modulos — mismo patron que Asiento.comprobanteOrigen (nota 07).
   */
  terceroTipo: TipoTerceroCheque;
  terceroId: string;
  /** Se completa al depositar (DepositarCheque) — cuenta propia donde entro. */
  cuentaBancariaId: string | null;
  estado: EstadoCheque;
}

/**
 * Nota 22, seccion 3: "Cheque.ts valida transiciones de estado (no se puede
 * COBRAR un cheque RECHAZADO)". Los estados terminales (COBRADO/RECHAZADO/
 * VENCIDO/CADUCADO/ANULADO) no tienen salida.
 */
const TRANSICIONES_VALIDAS: Record<EstadoCheque, readonly EstadoCheque[]> = {
  EMITIDO: ["COBRADO", "RECHAZADO", "ANULADO", "VENCIDO"],
  RECIBIDO: ["DEPOSITADO", "RECHAZADO", "ANULADO", "VENCIDO"],
  DEPOSITADO: ["COBRADO", "RECHAZADO"],
  COBRADO: [],
  RECHAZADO: [],
  VENCIDO: [],
  CADUCADO: [],
  ANULADO: [],
};

export function puedeTransicionar(estadoActual: EstadoCheque, estadoNuevo: EstadoCheque): boolean {
  return TRANSICIONES_VALIDAS[estadoActual].includes(estadoNuevo);
}

/** Solo un cheque RECIBIDO puede depositarse (nota 22, seccion 4: el flujo arranca en "cheque.estado = RECIBIDO"). */
export function puedeDepositarse(cheque: Pick<Cheque, "origen" | "estado">): boolean {
  return cheque.origen === "RECIBIDO" && puedeTransicionar(cheque.estado, "DEPOSITADO");
}
