import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

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

export const ETIQUETA_TIPO_VENCIMIENTO: Record<TipoVencimiento, string> = {
  IVA: "IVA",
  GANANCIAS: "Ganancias",
  MONOTRIBUTO: "Monotributo",
  INGRESOS_BRUTOS: "Ingresos Brutos",
  SICORE: "SICORE",
  SUELDOS: "Sueldos",
  OTRO: "Otro",
};

export const ESTADOS_VENCIMIENTO = ["PENDIENTE", "CUMPLIDO"] as const;
export type EstadoVencimiento = (typeof ESTADOS_VENCIMIENTO)[number];

export const ETIQUETA_ESTADO_VENCIMIENTO: Record<EstadoVencimiento, string> = {
  PENDIENTE: "Pendiente",
  CUMPLIDO: "Cumplido",
};

export interface Vencimiento {
  id: string;
  empresaId: string;
  tipo: TipoVencimiento;
  descripcion: string | null;
  periodo: string | null;
  fechaVencimiento: string;
  estado: EstadoVencimiento;
  fechaCumplido: string | null;
  asignadoAUsuarioId: string | null;
  creadoPorUsuarioId: string;
  fechaCreacion: string;
}

export interface NuevoVencimientoInput {
  empresaId: string;
  tipo: TipoVencimiento;
  descripcion?: string | null;
  periodo?: string | null;
  fechaVencimiento: string;
  asignadoAUsuarioId?: string | null;
}

export interface FiltrosVencimientos {
  empresaId?: string;
  tipo?: TipoVencimiento;
  estado?: EstadoVencimiento;
  desde?: string;
  hasta?: string;
}

/** Vencido = sigue pendiente pero su fecha ya paso. Calculado en el frontend, no es un estado guardado. */
export function esVencimientoVencido(vencimiento: Pick<Vencimiento, "estado" | "fechaVencimiento">): boolean {
  if (vencimiento.estado !== "PENDIENTE") return false;
  return new Date(vencimiento.fechaVencimiento).getTime() < Date.now();
}

function queryString(filtros: FiltrosVencimientos): string {
  const params = new URLSearchParams();
  if (filtros.empresaId) params.set("empresaId", filtros.empresaId);
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /estudio/vencimientos — calendario de vencimientos multi-cliente (gap
 * nuevo, ver claude/modulos-nacional-sistema-y-gap-estudio-contable.md,
 * seccion 3). Igual que useTareas, no pide X-Empresa-Id: es un tablero a
 * nivel estudio con filtro opcional por cliente.
 */
export function useVencimientos(filtros: FiltrosVencimientos = {}) {
  return useQuery({
    queryKey: ["vencimientos", filtros],
    queryFn: () => apiFetch<Vencimiento[]>(`/estudio/vencimientos${queryString(filtros)}`),
  });
}

export function useCrearVencimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoVencimientoInput) =>
      apiFetch<Vencimiento>("/estudio/vencimientos", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vencimientos"] });
    },
  });
}

export function useMarcarEstadoVencimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoVencimiento }) =>
      apiFetch<Vencimiento>(`/estudio/vencimientos/${id}/estado`, { method: "POST", body: { estado } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vencimientos"] });
    },
  });
}

export function useEliminarVencimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/estudio/vencimientos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vencimientos"] });
    },
  });
}
