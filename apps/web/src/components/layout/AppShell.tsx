import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NuevaEmpresaDialog } from "@/pages/empresas/NuevaEmpresaDialog";

const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/proveedores", label: "Proveedores" },
];

/**
 * Layout de las rutas protegidas (nota 06, seccion 5): sidebar + topbar con
 * la empresa activa, envolviendo el Outlet de cada pagina de modulo. Si
 * todavia no hay empresa activa elegida, muestra el selector en pantalla
 * completa en vez del shell (no tiene sentido mostrar un sidebar de modulos
 * que todos necesitan X-Empresa-Id).
 */
export function AppShell() {
  const session = useSession();

  if (!session.empresaActivaId) {
    return <EmpresaPicker />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <p className="mb-6 text-sm font-semibold">AP-Contadores</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-600">
            {session.usuario.nombre} {session.usuario.apellido}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Empresa: <span className="font-medium text-slate-600">{session.empresaActiva?.razonSocial}</span>
            </span>
            <Button size="sm" variant="outline" onClick={session.cambiarEmpresa}>
              Cambiar empresa
            </Button>
            <Button size="sm" variant="ghost" onClick={session.logout}>
              Cerrar sesion
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const routerState = useRouterState();
  const active = routerState.location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-md px-3 py-2 text-sm",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {label}
    </Link>
  );
}

function EmpresaPicker() {
  const session = useSession();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-lg font-semibold">Hola, {session.usuario.nombre}</h1>
      <p className="mb-6 text-sm text-slate-500">Elegi con que empresa queres trabajar.</p>

      {session.empresas.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavia no tenes empresas asignadas.{" "}
          {session.puedeCrearEmpresa
            ? "Crea la primera con el boton de abajo."
            : "Un OWNER/ADMIN del estudio puede darte acceso desde “Usuarios”."}
        </p>
      ) : (
        <ul className="space-y-2">
          {session.empresas.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm"
            >
              <span>
                {e.razonSocial} <span className="text-slate-400">({e.rol})</span>
              </span>
              <Button size="sm" variant="outline" onClick={() => session.setEmpresaActiva(e.id)}>
                Usar esta empresa
              </Button>
            </li>
          ))}
        </ul>
      )}

      {session.puedeCrearEmpresa && (
        <div className="mt-4">
          <NuevaEmpresaDialog triggerLabel={session.empresas.length === 0 ? "Crear mi primera empresa" : "Crear empresa nueva"} />
        </div>
      )}

      <div className="mt-6">
        <Button size="sm" variant="ghost" onClick={session.logout}>
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
}
