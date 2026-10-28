import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ProveedoresPage } from "./pages/proveedores/ProveedoresPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import { ComprobantesCompraPage } from "./pages/comprobantes-compra/ComprobantesCompraPage";
import { ComprobantesVentaPage } from "./pages/comprobantes-venta/ComprobantesVentaPage";
import { TesoreriaPage } from "./pages/tesoreria/TesoreriaPage";
import { ReportesPage } from "./pages/reportes/ReportesPage";
import { EstudioPage } from "./pages/estudio/EstudioPage";
import { VencimientosPage } from "./pages/vencimientos/VencimientosPage";
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

const comprobantesCompraRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/comprobantes-compra",
  component: ComprobantesCompraPage,
});

const comprobantesVentaRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/comprobantes-venta",
  component: ComprobantesVentaPage,
});

const tesoreriaRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/tesoreria",
  component: TesoreriaPage,
});

const reportesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/reportes",
  component: ReportesPage,
});

const estudioRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/estudio",
  component: EstudioPage,
});

const vencimientosRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/vencimientos",
  component: VencimientosPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    homeRoute,
    proveedoresRoute,
    clientesRoute,
    comprobantesCompraRoute,
    comprobantesVentaRoute,
    tesoreriaRoute,
    reportesRoute,
    estudioRoute,
    vencimientosRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
