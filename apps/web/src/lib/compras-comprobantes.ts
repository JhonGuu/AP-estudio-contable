import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export type EstadoComprobanteCompra = "BORRADOR" | "CONFIRMADO" | "ANULADO";
export type TipoImpuestoComprobante = "IVA" | "IIBB" | "OTROS";

export interface ComprobanteCompraItemInput {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  alicuotaIva: number;
}

export interface ComprobanteCompraImpuestoInput {
  tipo: TipoImpuestoComprobante;
  importe: number;
}

export interface ComprobanteCompra {
  id: string;
  proveedorId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  numero: number;
  fecha: string;
  netoTotal: number;
  exentoTotal: number;
  noGravadoTotal: number;
  importeTotal: number;
  saldoPendiente: number;
  estado: EstadoComprobanteCompra;
}

export interface NuevoComprobanteCompraInput {
  proveedorId: string;
  tipoComprobanteId: string;
  puntoVentaId: string;
  fecha: string;
  netoTotal: number;
  exentoTotal?: number;
  noGravadoTotal?: number;
  importeTotal: number;
  items: ComprobanteCompraItemInput[];
  impuestos: ComprobanteCompraImpuestoInput[];
}

/** GET /compras/comprobantes (nota 08, seccion 4-5). */
export function useComprobantesCompra() {
  return useQuery({
    queryKey: ["comprobantes-compra"],
    queryFn: () => apiFetch<ComprobanteCompra[]>("/compras/comprobantes", { conEmpresaActiva: true }),
  });
}

/** POST /compras/comprobantes — queda en BORRADOR, no dispara asiento todavia. */
export function useCrearComprobanteCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoComprobanteCompraInput) =>
      apiFetch<ComprobanteCompra>("/compras/comprobantes", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-compra"] });
    },
  });
}

/** POST /compras/comprobantes/:id/confirmar — dispara ASIENTO_COMPRA, ya no se puede editar. */
export function useConfirmarComprobanteCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ComprobanteCompra>(`/compras/comprobantes/${id}/confirmar`, {
        method: "POST",
        conEmpresaActiva: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-compra"] });
    },
  });
}
