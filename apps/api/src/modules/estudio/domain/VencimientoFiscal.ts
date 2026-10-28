/**
 * Calendario de vencimientos multi-cliente (gap nuevo — ver
 * `claude/modulos-nacional-sistema-y-gap-estudio-contable.md`, seccion 3,
 * "Calendario de vencimientos multi-cliente"). Segunda pieza de "Gestion del
 * estudio", despues de Tareas internas (ver TareaEstudio.ts).
 *
 * A diferencia de TareaEstudio (que puede ser interna o de un cliente), un
 * vencimiento fiscal siempre pertenece a un cliente puntual: no existe un
 * "vencimiento interno del estudio" en el sentido impositivo. Por eso
 * `empresaId` es obligatorio aca (a diferencia del nullable de TareaEstudio).
 *
 * Nacional Sistema no modela esto: los vencimientos de DDJJ dependerian del
 * modulo `fac`+`iva` (compliance fiscal/ARCA), que esta pospuesto a proposito
 * hasta el final del roadmap. Este modulo es deliberadamente mas simple: no
 * calcula fechas de vencimiento a partir de terminacion de CUIT ni genera
 * DDJJ — es un tablero de seguimiento donde el estudio anota manualmente cada
 * obligacion y su fecha limite, para no perder ninguna.
 */
export const TIPOS_VENCIMIENTO = [
  "IVA",
  "GANANCIAS",
  "MONOTRIBUTO",
  "INGRESOS_BRUTOS",
  "SICORE",
  "SUELDOS",
  "OTRO",
] as const;
export type TipoVencimiento = (typeof TIPOS_VENCIMIENTO)[number];

export const ESTADOS_VENCIMIENTO = ["PENDIENTE", "CUMPLIDO"] as const;
export type EstadoVencimiento = (typeof ESTADOS_VENCIMIENTO)[number];

export interface VencimientoFiscal {
  id: string;
  tenantId: string;
  empresaId: string;
  tipo: TipoVencimiento;
  descripcion: string | null;
  /** Periodo fiscal en formato libre (ej. "2026-09", "3er trimestre 2026"). */
  periodo: string | null;
  fechaVencimiento: Date;
  estado: EstadoVencimiento;
  fechaCumplido: Date | null;
  /** Opcional: a diferencia de TareaEstudio, un vencimiento puede quedar sin asignar hasta que alguien lo toma. */
  asignadoAUsuarioId: string | null;
  creadoPorUsuarioId: string;
  fechaCreacion: Date;
}
