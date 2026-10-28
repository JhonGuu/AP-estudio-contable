import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export const TIPOS_LIBRO_SOCIETARIO = [
  "ACTAS_DIRECTORIO",
  "ACTAS_ASAMBLEA",
  "ACTAS_REUNION_SOCIOS_GERENCIA",
  "REGISTRO_ACCIONES",
  "DEPOSITO_ACCIONES_ASISTENCIA",
  "DIARIO",
  "INVENTARIO_Y_BALANCES",
  "OTRO",
] as const;
export type TipoLibroSocietario = (typeof TIPOS_LIBRO_SOCIETARIO)[number];

export const ETIQUETA_TIPO_LIBRO_SOCIETARIO: Record<TipoLibroSocietario, string> = {
  ACTAS_DIRECTORIO: "Actas de Directorio",
  ACTAS_ASAMBLEA: "Actas de Asamblea",
  ACTAS_REUNION_SOCIOS_GERENCIA: "Actas de Reunion de Socios/Gerencia",
  REGISTRO_ACCIONES: "Registro de Acciones",
  DEPOSITO_ACCIONES_ASISTENCIA: "Deposito de Acciones y Asistencia a Asamblea",
  DIARIO: "Diario",
  INVENTARIO_Y_BALANCES: "Inventario y Balances",
  OTRO: "Otro",
};

export const ESTADOS_LIBRO_SOCIETARIO = ["EN_USO", "COMPLETO", "EXTRAVIADO"] as const;
export type EstadoLibroSocietario = (typeof ESTADOS_LIBRO_SOCIETARIO)[number];

export const ETIQUETA_ESTADO_LIBRO_SOCIETARIO: Record<EstadoLibroSocietario, string> = {
  EN_USO: "En uso",
  COMPLETO: "Completo",
  EXTRAVIADO: "Extraviado",
};

export interface LibroSocietario {
  id: string;
  empresaId: string;
  tipo: TipoLibroSocietario;
  numero: number;
  cantidadFolios: number | null;
  ultimoFolioUtilizado: number | null;
  fechaRubrica: string | null;
  ubicacion: string | null;
  estado: EstadoLibroSocietario;
  observaciones: string | null;
  creadoPorUsuarioId: string;
  fechaCreacion: string;
}

export interface NuevoLibroSocietarioInput {
  empresaId: string;
  tipo: TipoLibroSocietario;
  numero: number;
  cantidadFolios?: number | null;
  fechaRubrica?: string | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

export interface EditarLibroSocietarioInput {
  estado?: EstadoLibroSocietario;
  ultimoFolioUtilizado?: number | null;
  fechaRubrica?: string | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

export interface FiltrosLibrosSocietarios {
  empresaId?: string;
  tipo?: TipoLibroSocietario;
  estado?: EstadoLibroSocietario;
}

function queryString(filtros: FiltrosLibrosSocietarios): string {
  const params = new URLSearchParams();
  if (filtros.empresaId) params.set("empresaId", filtros.empresaId);
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.estado) params.set("estado", filtros.estado);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /estudio/libros-societarios — registro y seguimiento de libros
 * rubricados (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * Cuarta pieza de Gestion del estudio, a nivel estudio entero (sin
 * X-Empresa-Id), con filtro opcional por cliente.
 */
export function useLibrosSocietarios(filtros: FiltrosLibrosSocietarios = {}) {
  return useQuery({
    queryKey: ["libros-societarios", filtros],
    queryFn: () => apiFetch<LibroSocietario[]>(`/estudio/libros-societarios${queryString(filtros)}`),
  });
}

export function useCrearLibroSocietario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoLibroSocietarioInput) =>
      apiFetch<LibroSocietario>("/estudio/libros-societarios", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["libros-societarios"] });
    },
  });
}

export function useEditarLibroSocietario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: EditarLibroSocietarioInput & { id: string }) =>
      apiFetch<LibroSocietario>(`/estudio/libros-societarios/${id}`, { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["libros-societarios"] });
    },
  });
}

export function useEliminarLibroSocietario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/estudio/libros-societarios/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["libros-societarios"] });
    },
  });
}
