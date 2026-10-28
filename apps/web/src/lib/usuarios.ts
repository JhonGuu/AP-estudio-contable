import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface UsuarioPublico {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rolGlobal: string;
  estado: string;
}

/** GET /usuarios — personal del estudio, a nivel tenant (no pide X-Empresa-Id). */
export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: () => apiFetch<UsuarioPublico[]>("/usuarios"),
  });
}
