import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface Cliente {
  id: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio: string | null;
  activo: boolean;
}

export interface NuevoClienteInput {
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** GET /ventas/clientes (nota 08, seccion 5 — espejo de proveedores). */
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: () => apiFetch<Cliente[]>("/ventas/clientes", { conEmpresaActiva: true }),
  });
}

/** POST /ventas/clientes. */
export function useCrearCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoClienteInput) =>
      apiFetch<Cliente>("/ventas/clientes", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
