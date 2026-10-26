import { useState } from "react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientes } from "@/lib/clientes";
import { usePuntosVenta } from "@/lib/comprobantes-catalogo";
import {
  useComprobantesVenta,
  useConfirmarComprobanteVenta,
  type ComprobanteVenta,
  type EstadoComprobanteVenta,
} from "@/lib/ventas-comprobantes";
import { ApiError } from "@/lib/api-client";
import { formatFechaISO } from "@/lib/fecha";
import { NuevoPuntoVentaDialog } from "@/pages/comprobantes/NuevoPuntoVentaDialog";
import { NuevoComprobanteVentaDialog } from "./NuevoComprobanteVentaDialog";
import { RegistrarCobroDialog } from "./RegistrarCobroDialog";

const ESTADO_VARIANT: Record<EstadoComprobanteVenta, "default" | "success" | "warning" | "destructive"> = {
  BORRADOR: "warning",
  CONFIRMADO: "success",
  ANULADO: "destructive",
};

/** Espejo de ComprobantesCompraPage (nota 08, seccion 5). */
export function ComprobantesVentaPage() {
  const clientesQuery = useClientes();
  const puntosVentaQuery = usePuntosVenta();
  const comprobantesQuery = useComprobantesVenta();
  const confirmar = useConfirmarComprobanteVenta();
  const [comprobanteACobrar, setComprobanteACobrar] = useState<ComprobanteVenta | null>(null);

  const clienteNombre = (id: string) => clientesQuery.data?.find((c) => c.id === id)?.razonSocial ?? "-";

  const onConfirmar = (id: string) => {
    confirmar.mutate(id, {
      onSuccess: () => toast.success("Comprobante confirmado — asiento generado"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo confirmar"),
    });
  };

  const faltaClientes = clientesQuery.isSuccess && clientesQuery.data.length === 0;
  const faltaPuntoVenta = puntosVentaQuery.isSuccess && puntosVentaQuery.data.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Comprobantes de venta</h1>
          <p className="text-sm text-slate-500">Nota 08, seccion 4-5.</p>
        </div>
        {!faltaClientes && !faltaPuntoVenta && <NuevoComprobanteVentaDialog />}
      </div>

      {(faltaClientes || faltaPuntoVenta) && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Antes de cargar un comprobante necesitas:</p>
          <ul className="list-inside list-disc space-y-1">
            {faltaClientes && <li>Al menos un cliente (pantalla Clientes).</li>}
            {faltaPuntoVenta && <li>Al menos un punto de venta.</li>}
          </ul>
          {faltaPuntoVenta && <NuevoPuntoVentaDialog triggerLabel="Crear mi primer punto de venta" />}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        {comprobantesQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : comprobantesQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los comprobantes.</p>
        ) : comprobantesQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay comprobantes de venta cargados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Saldo pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprobantesQuery.data?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.numero}</TableCell>
                  <TableCell>{clienteNombre(c.clienteId)}</TableCell>
                  <TableCell>{formatFechaISO(c.fecha)}</TableCell>
                  <TableCell>$ {Number(c.importeTotal).toFixed(2)}</TableCell>
                  <TableCell>$ {Number(c.saldoPendiente).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.estado === "BORRADOR" && (
                      <Button size="sm" variant="outline" disabled={confirmar.isPending} onClick={() => onConfirmar(c.id)}>
                        Confirmar
                      </Button>
                    )}
                    {c.estado === "CONFIRMADO" && Number(c.saldoPendiente) > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setComprobanteACobrar(c)}>
                        Cobrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RegistrarCobroDialog
        comprobante={comprobanteACobrar}
        clienteNombre={comprobanteACobrar ? clienteNombre(comprobanteACobrar.clienteId) : ""}
        onOpenChange={(open) => {
          if (!open) setComprobanteACobrar(null);
        }}
      />
    </div>
  );
}
