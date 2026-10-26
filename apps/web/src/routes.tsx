import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ProveedoresPage } from "./pages/proveedores/ProveedoresPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";

/**
 * Ruteo "code-based" de TanStack Router (sin el plugin de generacion de
 * archivos). /login queda afuera del layout protegido; todo lo demas cuelga
 * de protectedRoute, que provee la sesion y el shell (sidebar + topbar con
 * la empresa activa — nota 06, seccion 5) y renderiza las paginas de modulo
 * en su Outlet.
 */
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: HomePage,
});

const proveedoresRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/proveedores",
  component: ProveedoresPage,
});

const clientesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/clientes",
  component: ClientesPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([homeRoute, proveedoresRoute, clientesRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
