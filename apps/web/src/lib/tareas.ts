import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export const ESTADOS_TAREA = ["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ETIQUETA_ESTADO_TAREA: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

/** Espeja `transicionEstadoValida` del backend (domain/TareaEstudio.ts) para habilitar/ocultar botones. */
const TRANSICIONES_VALIDAS: Record<EstadoTarea, readonly EstadoTarea[]> = {
  PENDIENTE: ["EN_PROCESO", "CANCELADA"],
  EN_PROCESO: ["PENDIENTE", "COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export function transicionesDisponibles(estado: EstadoTarea): readonly EstadoTarea[] {
  return TRANSICIONES_VALIDAS[estado];
}

export interface ItemChecklistTarea {
  id: string;
  tareaId: string;
  descripcion: string;
  completado: boolean;
  orden: number;
}

export interface Tarea {
  id: string;
  empresaId: string | null;
  titulo: string;
  descripcion: string | null;
  asignadoAUsuarioId: string;
  creadoPorUsuarioId: string;
  fechaLimite: string | null;
  estado: EstadoTarea;
  fechaCreacion: string;
  fechaCompletada: string | null;
  items: ItemChecklistTarea[];
}

export interface NuevaTareaInput {
  empresaId?: string | null;
  titulo: string;
  descripcion?: string | null;
  asignadoAUsuarioId: string;
  fechaLimite?: string | null;
}

export interface FiltrosTareas {
  empresaId?: string;
  asignadoAUsuarioId?: string;
  estado?: EstadoTarea;
}

function queryString(filtros: FiltrosTareas): string {
  const params = new URLSearchParams();
  if (filtros.empresaId) params.set("empresaId", filtros.empresaId);
  if (filtros.asignadoAUsuarioId) params.set("asignadoAUsuarioId", filtros.asignadoAUsuarioId);
  if (filtros.estado) params.set("estado", filtros.estado);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /estudio/tareas — modulo "gestion del estudio" (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md). No pide
 * X-Empresa-Id: las tareas son del estudio entero, con un filtro opcional
 * por cliente.
 */
export function useTareas(filtros: FiltrosTareas = {}) {
  return useQuery({
    queryKey: ["tareas", filtros],
    queryFn: () => apiFetch<Tarea[]>(`/estudio/tareas${queryString(filtros)}`),
  });
}

export function useCrearTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaTareaInput) => apiFetch<Tarea>("/estudio/tareas", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useCambiarEstadoTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoTarea }) =>
      apiFetch<Tarea>(`/estudio/tareas/${id}/estado`, { method: "POST", body: { estado } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useAgregarItemChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tareaId, descripcion }: { tareaId: string; descripcion: string }) =>
      apiFetch<ItemChecklistTarea>(`/estudio/tareas/${tareaId}/items`, {
        method: "POST",
        body: { descripcion },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useMarcarItemChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, completado }: { itemId: string; completado: boolean }) =>
      apiFetch<ItemChecklistTarea>(`/estudio/tareas/items/${itemId}`, {
        method: "POST",
        body: { completado },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}
