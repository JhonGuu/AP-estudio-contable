import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  usePanelMonotributo,
  useActualizarCategoriaMonotributo,
  ETIQUETA_ESTADO_MONOTRIBUTO,
  type EstadoMonotributo,
} from "@/lib/monotributo";
import { useCatalogos } from "@/lib/catalogos";
import { ApiError } from "@/lib/api-client";

const VARIANTE_ESTADO: Record<EstadoMonotributo, "default" | "success" | "warning" | "destructive"> = {
  SIN_CATEGORIZAR: "default",
  OK: "success",
  ALERTA: "warning",
  EXCEDIDO: "destructive",
};

const SIN_CATEGORIA = "";

function formatImporte(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Panel de monotributo (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * Tercera pieza de Gestion del estudio. A diferencia de Tareas y
 * Vencimientos, no tiene alta/baja propia: lista automaticamente a los
 * clientes con condicionIva Monotributo (filtrado en el backend) y la unica
 * accion es declarar/cambiar su categoria — la facturacion acumulada y el
 * estado se calculan solos a partir de las ventas confirmadas.
 */
export function MonotributoPage() {
  const panelQuery = usePanelMonotributo();
  const catalogosQuery = useCatalogos();
  const actualizarCategoria = useActualizarCategoriaMonotributo();

  const categorias = catalogosQuery.data?.categoriasMonotributo ?? [];

  const onCambiarCategoria = (empresaId: string, categoriaMonotributoId: string) => {
    actualizarCategoria.mutate(
      { empresaId, categoriaMonotributoId: categoriaMonotributoId || null },
      {
        onSuccess: () => toast.success(categoriaMonotributoId ? "Categoria actualizada" : "Categoria quitada"),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar la categoria"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Panel de monotributo</h1>
        <p className="text-sm text-slate-500">
          Clientes monotributistas del estudio: categoria declarada, facturacion acumulada de los ultimos 12 meses
          (movil, igual al criterio de ARCA) y alerta antes de una recategorizacion o exclusion.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {panelQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : panelQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudo cargar el panel.</p>
        ) : panelQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Todavia no hay clientes con condicion de IVA Monotributo. Se agregan solos aca cuando corresponde.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Facturacion (12 meses)</TableHead>
                <TableHead>Tope de la categoria</TableHead>
                <TableHead>% del tope</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panelQuery.data?.map((item) => (
                <TableRow key={item.empresaId} className={item.estado === "EXCEDIDO" ? "bg-red-50" : undefined}>
                  <TableCell className="font-medium">{item.razonSocial}</TableCell>
                  <TableCell>
                    <Select
                      value={item.categoriaMonotributoId ?? SIN_CATEGORIA}
                      disabled={actualizarCategoria.isPending}
                      onChange={(e) => onCambiarCategoria(item.empresaId, e.target.value)}
                    >
                      <option value={SIN_CATEGORIA}>Sin categorizar</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo}
                          {c.soloVentaBienes ? " (solo venta de bienes)" : ""}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>${formatImporte(item.facturacionAcumulada)}</TableCell>
                  <TableCell>{item.topeCategoria !== null ? `$${formatImporte(item.topeCategoria)}` : "-"}</TableCell>
                  <TableCell className={item.estado === "EXCEDIDO" ? "font-medium text-red-700" : undefined}>
                    {item.porcentajeTope !== null ? `${(item.porcentajeTope * 100).toFixed(1)}%` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE_ESTADO[item.estado]}>{ETIQUETA_ESTADO_MONOTRIBUTO[item.estado]}</Badge>
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
