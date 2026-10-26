import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface Proveedor {
  id: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio: string | null;
  activo: boolean;
}

export interface NuevoProveedorInput {
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio?: string | null;
}

/** GET /compras/proveedores (nota 08, seccion 5). */
export function useProveedores() {
  return useQuery({
    queryKey: ["proveedores"],
    queryFn: () => apiFetch<Proveedor[]>("/compras/proveedores", { conEmpresaActiva: true }),
  });
}

/** POST /compras/proveedores. */
export function useCrearProveedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoProveedorInput) =>
      apiFetch<Proveedor>("/compras/proveedores", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
  });
}
