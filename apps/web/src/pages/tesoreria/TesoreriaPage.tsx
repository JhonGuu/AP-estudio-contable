import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCatalogos } from "@/lib/catalogos";
import { useCajas, useCuentasBancarias, useTarjetas } from "@/lib/tesoreria";
import { NuevaCajaDialog } from "./NuevaCajaDialog";
import { NuevaCuentaBancariaDialog } from "./NuevaCuentaBancariaDialog";
import { NuevaTarjetaDialog } from "./NuevaTarjetaDialog";

/** Nota 22, seccion 6: Caja/Cuenta Bancaria/Tarjeta, ABM simple (sin movimientos todavia). */
export function TesoreriaPage() {
  const catalogosQuery = useCatalogos();
  const cajasQuery = useCajas();
  const cuentasBancariasQuery = useCuentasBancarias();
  const tarjetasQuery = useTarjetas();

  const simboloMoneda = (monedaId: string) => catalogosQuery.data?.monedas.find((m) => m.id === monedaId)?.simbolo ?? "$";
  const nombreCuentaBancaria = (id: string) => cuentasBancariasQuery.data?.find((c) => c.id === id)?.nombre ?? "-";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Tesoreria</h1>
        <p className="text-sm text-slate-500">Nota 22, seccion 6. Medios de pago propios de la empresa.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Cajas</CardTitle>
            <CardDescription>Efectivo en mano.</CardDescription>
          </div>
          <NuevaCajaDialog />
        </CardHeader>
        <CardContent>
          {cajasQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : cajasQuery.data?.length === 0 ? (
            <p className="text-sm text-slate-500">Todavia no hay cajas cargadas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cajasQuery.data?.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{c.nombre}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {simboloMoneda(c.monedaId)} {Number(c.saldo).toFixed(2)}
                    </span>
                    <Badge variant={c.activa ? "success" : "default"}>{c.activa ? "Activa" : "Inactiva"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Cuentas bancarias</CardTitle>
            <CardDescription>Cuentas corrientes/cajas de ahorro.</CardDescription>
          </div>
          <NuevaCuentaBancariaDialog />
        </CardHeader>
        <CardContent>
          {cuentasBancariasQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : cuentasBancariasQuery.data?.length === 0 ? (
            <p className="text-sm text-slate-500">Todavia no hay cuentas bancarias cargadas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cuentasBancariasQuery.data?.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {c.nombre} <span className="text-slate-400">({c.banco})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {simboloMoneda(c.monedaId)} {Number(c.saldo).toFixed(2)}
                    </span>
                    <Badge variant={c.activa ? "success" : "default"}>{c.activa ? "Activa" : "Inactiva"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Tarjetas</CardTitle>
            <CardDescription>Terminales de tarjeta de credito/debito.</CardDescription>
          </div>
          {cuentasBancariasQuery.data?.length ? (
            <NuevaTarjetaDialog />
          ) : null}
        </CardHeader>
        <CardContent>
          {cuentasBancariasQuery.isSuccess && cuentasBancariasQuery.data.length === 0 ? (
            <p className="text-sm text-amber-700">
              Primero necesitas al menos una cuenta bancaria (la tarjeta liquida ahi).
            </p>
          ) : tarjetasQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : tarjetasQuery.data?.length === 0 ? (
            <p className="text-sm text-slate-500">Todavia no hay tarjetas cargadas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tarjetasQuery.data?.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.nombre}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-500">liquida en {nombreCuentaBancaria(t.cuentaLiquidadoraId)}</span>
                    <Badge variant={t.activa ? "success" : "default"}>{t.activa ? "Activa" : "Inactiva"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
