/**
 * Gestion del estudio (gap nuevo identificado por busqueda externa, sin nota
 * de diseno original ni en Nacional Sistema — ver
 * `claude/modulos-nacional-sistema-y-gap-estudio-contable.md`, seccion 3,
 * "Gestion de tareas internas del estudio" + "Mini-tareas / checklists").
 *
 * A diferencia del resto de los modulos de negocio (contabilidad, compras,
 * ventas, tesoreria), este opera a nivel TENANT, no a nivel EMPRESA: una
 * tarea puede ser "para un cliente" (empresaId seteado) o interna del estudio
 * (empresaId null) — el personal del estudio ve todas sus tareas en un solo
 * lugar, sin tener que cambiar de "empresa activa" para cada cliente.
 */
export const ESTADOS_TAREA = ["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export interface TareaEstudio {
  id: string;
  tenantId: string;
  /** null = tarea interna del estudio, no asociada a un cliente puntual. */
  empresaId: string | null;
  titulo: string;
  descripcion: string | null;
  asignadoAUsuarioId: string;
  creadoPorUsuarioId: string;
  fechaLimite: Date | null;
  estado: EstadoTarea;
  fechaCreacion: Date;
  fechaCompletada: Date | null;
}

export interface ItemChecklistTarea {
  id: string;
  tareaId: string;
  descripcion: string;
  completado: boolean;
  orden: number;
}

export interface TareaConItems extends TareaEstudio {
  items: ItemChecklistTarea[];
}

/**
 * Maquina de estados simple (espeja el patron de `Cheque.ts`): PENDIENTE y
 * EN_PROCESO son los unicos estados "en curso"; COMPLETADA y CANCELADA son
 * terminales. Se puede volver de EN_PROCESO a PENDIENTE (ej. se reasigna o se
 * pausa), pero no hay vuelta desde un estado terminal.
 */
const TRANSICIONES_VALIDAS: Record<EstadoTarea, readonly EstadoTarea[]> = {
  PENDIENTE: ["EN_PROCESO", "CANCELADA"],
  EN_PROCESO: ["PENDIENTE", "COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export function transicionEstadoValida(desde: EstadoTarea, hasta: EstadoTarea): boolean {
  return TRANSICIONES_VALIDAS[desde].includes(hasta);
}
