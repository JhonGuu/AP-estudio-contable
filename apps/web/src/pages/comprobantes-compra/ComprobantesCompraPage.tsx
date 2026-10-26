import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProveedores } from "@/lib/proveedores";
import { usePuntosVenta } from "@/lib/comprobantes-catalogo";
import { useComprobantesCompra, useConfirmarComprobanteCompra, type EstadoComprobanteCompra } from "@/lib/compras-comprobantes";
import { ApiError } from "@/lib/api-client";
import { formatFechaISO } from "@/lib/fecha";
import { NuevoPuntoVentaDialog } from "@/pages/comprobantes/NuevoPuntoVentaDialog";
import { NuevoComprobanteCompraDialog } from "./NuevoComprobanteCompraDialog";

const ESTADO_VARIANT: Record<EstadoComprobanteCompra, "default" | "success" | "warning" | "destructive"> = {
  BORRADOR: "warning",
  CONFIRMADO: "success",
  ANULADO: "destructive",
};

export function ComprobantesCompraPage() {
  const proveedoresQuery = useProveedores();
  const puntosVentaQuery = usePuntosVenta();
  const comprobantesQuery = useComprobantesCompra();
  const confirmar = useConfirmarComprobanteCompra();

  const proveedorNombre = (id: string) => proveedoresQuery.data?.find((p) => p.id === id)?.razonSocial ?? "-";

  const onConfirmar = (id: string) => {
    confirmar.mutate(id, {
      onSuccess: () => toast.success("Comprobante confirmado — asiento generado"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo confirmar"),
    });
  };

  const faltaProveedores = proveedoresQuery.isSuccess && proveedoresQuery.data.length === 0;
  const faltaPuntoVenta = puntosVentaQuery.isSuccess && puntosVentaQuery.data.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Comprobantes de compra</h1>
          <p className="text-sm text-slate-500">Nota 08, seccion 4-5.</p>
        </div>
        {!faltaProveedores && !faltaPuntoVenta && <NuevoComprobanteCompraDialog />}
      </div>

      {(faltaProveedores || faltaPuntoVenta) && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Antes de cargar un comprobante necesitas:</p>
          <ul className="list-inside list-disc space-y-1">
            {faltaProveedores && <li>Al menos un proveedor (pantalla Proveedores).</li>}
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
          <p className="p-6 text-sm text-slate-500">Todavia no hay comprobantes de compra cargados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Proveedor</TableHead>
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
                  <TableCell>{proveedorNombre(c.proveedorId)}</TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
