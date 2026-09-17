import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

/**
 * Ruteo "code-based" de TanStack Router (sin el plugin de generacion de
 * archivos): mas facil de mantener a mano en las primeras pantallas, se puede
 * migrar a file-based routing mas adelante sin cambiar la libreria.
 */
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
