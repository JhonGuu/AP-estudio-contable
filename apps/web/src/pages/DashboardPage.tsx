import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { authStorage } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";

interface PerfilResponse {
  usuario: { id: string; nombre: string; apellido: string; email: string };
  empresas: { empresaId: string; rol: string }[];
}

/**
 * Placeholder del "selector de empresa activa" de nota 06, seccion 5: lista
 * las empresas del usuario y, al elegir una, la fija como activa (header
 * X-Empresa-Id en adelante) sin volver a loguearse.
 */
export function DashboardPage() {
  const navigate = useNavigate();

  const perfilQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<PerfilResponse>("/me"),
    retry: false,
  });

  useEffect(() => {
    if (perfilQuery.isError) {
      authStorage.clear();
      void navigate({ to: "/login" });
    }
  }, [perfilQuery.isError, navigate]);

  if (perfilQuery.isLoading) {
    return <div className="p-8 text-sm text-slate-500">Cargando...</div>;
  }

  if (!perfilQuery.data) return null;

  const { usuario, empresas } = perfilQuery.data;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-lg font-semibold">
        Hola, {usuario.nombre} {usuario.apellido}
      </h1>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-slate-700">Tus empresas</h2>
        {empresas.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavia no tenes empresas asignadas. Un OWNER/ADMIN del estudio puede darte acceso desde
            &quot;Usuarios&quot;.
          </p>
        ) : (
          <ul className="space-y-2">
            {empresas.map((e) => (
              <li key={e.empresaId} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                <span>
                  {e.empresaId} <span className="text-slate-400">({e.rol})</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => authStorage.setEmpresaActiva(e.empresaId)}
                >
                  Usar esta empresa
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
