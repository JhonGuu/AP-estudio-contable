import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface Empresa {
  id: string;
  razonSocial: string;
  nombreComercial: string | null;
  cuit: string;
  condicionIvaId: string;
  domicilioFiscal: string;
  provinciaId: string;
  actividadAfip: string;
  monedaBaseId: string;
  cierreEjercicio: string;
}

export interface NuevaEmpresaInput {
  razonSocial: string;
  nombreComercial?: string | null;
  cuit: string;
  condicionIvaId: string;
  domicilioFiscal: string;
  provinciaId: string;
  actividadAfip: string;
  monedaBaseId: string;
  cierreEjercicio: string;
}

/**
 * GET /empresas — mismo queryKey que usa SessionProvider internamente, asi
 * que React Query deduplica el fetch en vez de pedirlo dos veces. Usado por
 * el modulo "estudio" para el selector de cliente al crear/filtrar tareas.
 */
export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: () => apiFetch<Empresa[]>("/empresas"),
  });
}

/**
 * POST /empresas (nota 06, seccion 4): alta de empresa dentro del tenant
 * actual. Requiere rolGlobal OWNER/ADMIN (el backend lo valida, el frontend
 * solo oculta el boton para no ofrecer algo que va a rebotar con 403). Quien
 * la crea queda OWNER de la empresa automaticamente, por eso invalidamos
 * tanto "empresas" (lista de razones sociales) como "me" (accesos del
 * usuario, de donde sale si la nueva empresa aparece en su selector).
 */
export function useCrearEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaEmpresaInput) => apiFetch<Empresa>("/empresas", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["empresas"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
