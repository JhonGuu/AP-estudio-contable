import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiFetch } from "./api-client";
import { authStorage } from "./auth-storage";

interface PerfilEmpresa {
  empresaId: string;
  rol: string;
}

interface PerfilResponse {
  usuario: { id: string; nombre: string; apellido: string; email: string };
  empresas: PerfilEmpresa[];
}

interface Empresa {
  id: string;
  razonSocial: string;
  nombreComercial: string | null;
  cuit: string;
}

interface EmpresaConRol extends Empresa {
  rol: string;
}

interface SessionContextValue {
  usuario: PerfilResponse["usuario"];
  /** Empresas a las que el usuario tiene acceso (nota 06, seccion 5), con nombre resuelto. */
  empresas: EmpresaConRol[];
  empresaActivaId: string | null;
  empresaActiva: EmpresaConRol | null;
  setEmpresaActiva: (empresaId: string) => void;
  cambiarEmpresa: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Unico punto de verdad de "quien soy" + "que empresa tengo activa" (nota 06,
 * seccion 5). Envuelve las rutas protegidas: si /me falla (token vencido o
 * invalido) redirige a /login. El resto de la app consume esto via
 * useSession() en vez de repetir el fetch.
 *
 * GET /me solo devuelve empresaId+rol (nota 06) — se cruza con GET /empresas
 * (que trae razonSocial) para no mostrarle al usuario un UUID pelado en el
 * selector.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [empresaActivaId, setEmpresaActivaId] = useState<string | null>(() => authStorage.getEmpresaActivaId());

  const perfilQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<PerfilResponse>("/me"),
    retry: false,
  });

  const empresasQuery = useQuery({
    queryKey: ["empresas"],
    queryFn: () => apiFetch<Empresa[]>("/empresas"),
    enabled: perfilQuery.isSuccess,
    retry: false,
  });

  useEffect(() => {
    if (perfilQuery.isError) {
      authStorage.clear();
      void navigate({ to: "/login" });
    }
  }, [perfilQuery.isError, navigate]);

  const setEmpresaActiva = (empresaId: string) => {
    authStorage.setEmpresaActiva(empresaId);
    setEmpresaActivaId(empresaId);
  };

  const cambiarEmpresa = () => {
    authStorage.clearEmpresaActiva();
    setEmpresaActivaId(null);
  };

  const logout = () => {
    authStorage.clear();
    queryClient.clear();
    void navigate({ to: "/login" });
  };

  const value = useMemo<SessionContextValue | null>(() => {
    if (!perfilQuery.data || !empresasQuery.data) return null;

    const empresasPorId = new Map(empresasQuery.data.map((e) => [e.id, e]));
    const empresas: EmpresaConRol[] = perfilQuery.data.empresas
      .map((acceso) => {
        const empresa = empresasPorId.get(acceso.empresaId);
        return empresa ? { ...empresa, rol: acceso.rol } : null;
      })
      .filter((e): e is EmpresaConRol => e !== null);

    const empresaActiva = empresas.find((e) => e.id === empresaActivaId) ?? null;

    return {
      usuario: perfilQuery.data.usuario,
      empresas,
      empresaActivaId: empresaActiva ? empresaActivaId : null,
      empresaActiva,
      setEmpresaActiva,
      cambiarEmpresa,
      logout,
    };
  }, [perfilQuery.data, empresasQuery.data, empresaActivaId]);

  if (perfilQuery.isLoading || (perfilQuery.isSuccess && empresasQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando...</div>
    );
  }

  if (!value) return null;

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
