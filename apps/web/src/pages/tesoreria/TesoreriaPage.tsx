import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useCatalogos } from "@/lib/catalogos";
import { useProveedores } from "@/lib/proveedores";
import { useClientes } from "@/lib/clientes";
import { formatFechaISO } from "@/lib/fecha";
import { ApiError } from "@/lib/api-client";
import {
  useCajas,
  useCuentasBancarias,
  useTarjetas,
  useChequeras,
  useCheques,
  useRechazarCheque,
  useMovimientosFondo,
  type Cheque,
  type EstadoCheque,
  type TipoCuentaFondo,
} from "@/lib/tesoreria";
import { NuevaCajaDialog } from "./NuevaCajaDialog";
import { NuevaCuentaBancariaDialog } from "./NuevaCuentaBancariaDialog";
import { NuevaTarjetaDialog } from "./NuevaTarjetaDialog";
import { NuevaChequeraDialog } from "./NuevaChequeraDialog";
import { NuevoChequeDialog } from "./NuevoChequeDialog";
import { DepositarChequeDialog } from "./DepositarChequeDialog";
import { NuevoMovimientoFondoDialog } from "./NuevoMovimientoFondoDialog";

const ESTADO_CHEQUE_VARIANT: Record<EstadoCheque, "default" | "success" | "warning" | "destructive"> = {
  EMITIDO: "warning",
  RECIBIDO: "warning",
  DEPOSITADO: "success",
  COBRADO: "success",
  RECHAZADO: "destructive",
  VENCIDO: "destructive",
  CADUCADO: "destructive",
  ANULADO: "destructive",
};

const RECHAZABLE: EstadoCheque[] = ["EMITIDO", "RECIBIDO", "DEPOSITADO"];

/** Nota 22, seccion 6: Caja/Cuenta Bancaria/Tarjeta + Cheques + Movimientos de fondo. */
export function TesoreriaPage() {
  const catalogosQuery = useCatalogos();
  const cajasQuery = useCajas();
  const cuentasBancariasQuery = useCuentasBancarias();
  const tarjetasQuery = useTarjetas();
  const chequerasQuery = useChequeras();
  const chequesQuery = useCheques();
  const rechazarCheque = useRechazarCheque();
  const movimientosQuery = useMovimientosFondo();
  const proveedoresQuery = useProveedores();
  const clientesQuery = useClientes();
  const [chequeADepositar, setChequeADepositar] = useState<Cheque | null>(null);

  const simboloMoneda = (monedaId: string) => catalogosQuery.data?.monedas.find((m) => m.id === monedaId)?.simbolo ?? "$";
  const nombreCuentaBancaria = (id: string) => cuentasBancariasQuery.data?.find((c) => c.id === id)?.nombre ?? "-";

  const nombreTercero = (cheque: Cheque) =>
    cheque.terceroTipo === "PROVEEDOR"
      ? proveedoresQuery.data?.find((p) => p.id === cheque.terceroId)?.razonSocial ?? "-"
      : clientesQuery.data?.find((c) => c.id === cheque.terceroId)?.razonSocial ?? "-";

  const nombreCuentaFondo = (tipo: TipoCuentaFondo | null, id: string | null) => {
    if (!tipo || !id) return "-";
    if (tipo === "CAJA") return `Caja — ${cajasQuery.data?.find((c) => c.id === id)?.nombre ?? "-"}`;
    return `Cuenta bancaria — ${cuentasBancariasQuery.data?.find((c) => c.id === id)?.nombre ?? "-"}`;
  };

  const onRechazar = (id: string) => {
    rechazarCheque.mutate(id, {
      onSuccess: () => toast.success("Cheque rechazado"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo rechazar"),
    });
  };

  const faltaCuentaBancariaParaChequera = cuentasBancariasQuery.isSuccess && cuentasBancariasQuery.data.length === 0;
  const faltaChequeraParaCheque = chequerasQuery.isSuccess && chequerasQuery.data.length === 0;

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
          {cuentasBancariasQuery.data?.length ? <NuevaTarjetaDialog /> : null}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Cheques</CardTitle>
            <CardDescription>Propios (EMITIDO, a proveedores) y de terceros (RECIBIDO, de clientes).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!faltaCuentaBancariaParaChequera && <NuevaChequeraDialog />}
            {!faltaCuentaBancariaParaChequera && <NuevoChequeDialog />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {faltaCuentaBancariaParaChequera ? (
            <p className="text-sm text-amber-700">
              Primero necesitas una cuenta bancaria (de ahi sale la chequera para cheques propios, y donde depositas
              los recibidos).
            </p>
          ) : (
            <>
              {faltaChequeraParaCheque && (
                <p className="text-sm text-amber-700">
                  Para emitir un cheque propio primero necesitas una chequera. Para registrar uno recibido de un
                  cliente no hace falta.
                </p>
              )}
              {chequesQuery.isLoading ? (
                <p className="text-sm text-slate-500">Cargando...</p>
              ) : chequesQuery.data?.length === 0 ? (
                <p className="text-sm text-slate-500">Todavia no hay cheques cargados.</p>
              ) : null}
            </>
          )}
          {!faltaCuentaBancariaParaChequera && chequesQuery.data && chequesQuery.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesQuery.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero}</TableCell>
                    <TableCell>{c.origen === "EMITIDO" ? "Emitido" : "Recibido"}</TableCell>
                    <TableCell>{nombreTercero(c)}</TableCell>
                    <TableCell>{formatFechaISO(c.fechaVencimiento)}</TableCell>
                    <TableCell>$ {Number(c.importe).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_CHEQUE_VARIANT[c.estado]}>{c.estado}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      {c.origen === "RECIBIDO" && c.estado === "RECIBIDO" && (
                        <Button size="sm" variant="outline" onClick={() => setChequeADepositar(c)}>
                          Depositar
                        </Button>
                      )}
                      {RECHAZABLE.includes(c.estado) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={rechazarCheque.isPending}
                          onClick={() => onRechazar(c.id)}
                        >
                          Rechazar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Movimientos de fondo</CardTitle>
            <CardDescription>Transferencias entre cuentas propias y ajustes manuales.</CardDescription>
          </div>
          {!!cajasQuery.data?.length || !!cuentasBancariasQuery.data?.length ? <NuevoMovimientoFondoDialog /> : null}
        </CardHeader>
        <CardContent>
          {!cajasQuery.data?.length && !cuentasBancariasQuery.data?.length ? (
            <p className="text-sm text-amber-700">Primero necesitas al menos una caja o cuenta bancaria.</p>
          ) : movimientosQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : movimientosQuery.data?.length === 0 ? (
            <p className="text-sm text-slate-500">Todavia no hay movimientos cargados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosQuery.data?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatFechaISO(m.fecha)}</TableCell>
                    <TableCell>{m.tipo === "TRANSFERENCIA" ? "Transferencia" : "Ajuste"}</TableCell>
                    <TableCell>{m.descripcion}</TableCell>
                    <TableCell>{nombreCuentaFondo(m.cuentaOrigenTipo, m.cuentaOrigenId)}</TableCell>
                    <TableCell>{nombreCuentaFondo(m.cuentaDestinoTipo, m.cuentaDestinoId)}</TableCell>
                    <TableCell>$ {Number(m.importe).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DepositarChequeDialog
        cheque={chequeADepositar}
        onOpenChange={(open) => {
          if (!open) setChequeADepositar(null);
        }}
      />
    </div>
  );
}
