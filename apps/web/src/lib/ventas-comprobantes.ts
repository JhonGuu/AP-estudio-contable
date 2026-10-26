import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export type EstadoComprobanteVenta = "BORRADOR" | "CONFIRMADO" | "ANULADO";
export type TipoImpuestoComprobanteVenta = "IVA" | "IIBB" | "OTROS";

export interface ComprobanteVentaItemInput {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  alicuotaIva: number;
}

export interface ComprobanteVentaImpuestoInput {
  tipo: TipoImpuestoComprobanteVenta;
  importe: number;
}

export interface ComprobanteVenta {
  id: string;
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  numero: number;
  fecha: string;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  saldoPendiente: number;
  estado: EstadoComprobanteVenta;
  cae: string | null;
}

export interface NuevoComprobanteVentaInput {
  clienteId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: string;
  netoTotal: number;
  exentoTotal?: number;
  noGravadoTotal?: number;
  importeTotal: number;
  items: ComprobanteVentaItemInput[];
  impuestos: ComprobanteVentaImpuestoInput[];
}

/** GET /ventas/comprobantes (nota 08, seccion 4-5 — espejo de compras). */
export function useComprobantesVenta() {
  return useQuery({
    queryKey: ["comprobantes-venta"],
    queryFn: () => apiFetch<ComprobanteVenta[]>("/ventas/comprobantes", { conEmpresaActiva: true }),
  });
}

/** POST /ventas/comprobantes — queda en BORRADOR, no dispara asiento todavia. */
export function useCrearComprobanteVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoComprobanteVentaInput) =>
      apiFetch<ComprobanteVenta>("/ventas/comprobantes", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-venta"] });
    },
  });
}

/** POST /ventas/comprobantes/:id/confirmar — dispara ASIENTO_VENTA, ya no se puede editar. */
export function useConfirmarComprobanteVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ComprobanteVenta>(`/ventas/comprobantes/${id}/confirmar`, {
        method: "POST",
        conEmpresaActiva: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-venta"] });
    },
  });
}
