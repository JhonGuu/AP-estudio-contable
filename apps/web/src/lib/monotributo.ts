import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export const ESTADOS_MONOTRIBUTO = ["SIN_CATEGORIZAR", "OK", "ALERTA", "EXCEDIDO"] as const;
export type EstadoMonotributo = (typeof ESTADOS_MONOTRIBUTO)[number];

export const ETIQUETA_ESTADO_MONOTRIBUTO: Record<EstadoMonotributo, string> = {
  SIN_CATEGORIZAR: "Sin categorizar",
  OK: "OK",
  ALERTA: "Cerca del tope",
  EXCEDIDO: "Excedido",
};

export interface ItemPanelMonotributo {
  empresaId: string;
  razonSocial: string;
  categoriaMonotributoId: string | null;
  facturacionAcumulada: number;
  topeCategoria: number | null;
  porcentajeTope: number | null;
  estado: EstadoMonotributo;
}

/**
 * Panel de monotributo (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * GET /estudio/monotributo — igual que useTareas/useVencimientos, a nivel
 * estudio entero, sin X-Empresa-Id. La facturacion acumulada se recalcula en
 * el backend en cada pedido (no hay cache propia: refetch simple).
 */
export function usePanelMonotributo() {
  return useQuery({
    queryKey: ["monotributo"],
    queryFn: () => apiFetch<ItemPanelMonotributo[]>("/estudio/monotributo"),
  });
}

export function useActualizarCategoriaMonotributo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, categoriaMonotributoId }: { empresaId: string; categoriaMonotributoId: string | null }) =>
      apiFetch(`/estudio/monotributo/${empresaId}/categoria`, { method: "POST", body: { categoriaMonotributoId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monotributo"] });
      void queryClient.invalidateQueries({ queryKey: ["empresas"] });
    },
  });
}
