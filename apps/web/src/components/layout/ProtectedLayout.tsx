import { SessionProvider } from "@/lib/session-context";
import { AppShell } from "./AppShell";

/** Punto de entrada de las rutas protegidas: provee la sesion y renderiza el shell. */
export function ProtectedLayout() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}
