import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface TipoComprobante {
  id: string;
  codigo: string;
  nombre: string;
  aplicaA: "COMPRA" | "VENTA" | "AMBOS";
  afectaIva: boolean;
  afectaCuentaCorriente: boolean;
  requiereCae: boolean;
}

export interface PuntoVenta {
  id: string;
  numero: number;
  nombre: string;
}

export interface NuevoPuntoVentaInput {
  numero: number;
  nombre: string;
}

/**
 * GET /tipos-comprobante (nota 08, seccion 5 — catalogo global compartido
 * compras/ventas). aplicaA filtra por COMPRA|VENTA; el backend tambien
 * acepta AMBOS implicitamente (los incluye siempre que el filtro coincida).
 */
export function useTiposComprobante(aplicaA: "COMPRA" | "VENTA") {
  return useQuery({
    queryKey: ["tipos-comprobante", aplicaA],
    queryFn: () => apiFetch<TipoComprobante[]>(`/tipos-comprobante?aplicaA=${aplicaA}`),
    staleTime: 10 * 60_000,
  });
}

/** GET /puntos-venta — por empresa. */
export function usePuntosVenta() {
  return useQuery({
    queryKey: ["puntos-venta"],
    queryFn: () => apiFetch<PuntoVenta[]>("/puntos-venta", { conEmpresaActiva: true }),
  });
}

/** POST /puntos-venta. */
export function useCrearPuntoVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoPuntoVentaInput) =>
      apiFetch<PuntoVenta>("/puntos-venta", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["puntos-venta"] });
    },
  });
}
