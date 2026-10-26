import { useSession } from "@/lib/session-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Pantalla de inicio una vez elegida la empresa activa (el selector en si
 * vive en AppShell). Por ahora es un placeholder simple — mas adelante puede
 * sumar indicadores (comprobantes pendientes, saldos de caja, etc.).
 */
export function HomePage() {
  const session = useSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">
          {session.empresaActiva?.razonSocial}
        </h1>
        <p className="text-sm text-slate-500">CUIT {session.empresaActiva?.cuit}</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Empezar</CardTitle>
          <CardDescription>Modulos disponibles para esta empresa.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Por ahora: Proveedores y Clientes. El resto (comprobantes de compra/venta, pagos/cobros y
          tesoreria) ya funciona en el servidor y se va agregando pantalla por pantalla.
        </CardContent>
      </Card>
    </div>
  );
}
