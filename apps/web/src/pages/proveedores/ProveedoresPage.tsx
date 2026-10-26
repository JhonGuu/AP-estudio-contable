import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCatalogos } from "@/lib/catalogos";
import { useProveedores } from "@/lib/proveedores";
import { NuevoProveedorDialog } from "./NuevoProveedorDialog";

export function ProveedoresPage() {
  const proveedoresQuery = useProveedores();
  const catalogosQuery = useCatalogos();

  const nombreCondicionIva = (id: string) =>
    catalogosQuery.data?.condicionesIva.find((c) => c.id === id)?.nombre ?? "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Proveedores</h1>
          <p className="text-sm text-slate-500">Nota 08, seccion 2.</p>
        </div>
        <NuevoProveedorDialog />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {proveedoresQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : proveedoresQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los proveedores.</p>
        ) : proveedoresQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay proveedores. Creá el primero.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razon social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Condicion IVA</TableHead>
                <TableHead>Domicilio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedoresQuery.data?.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell className="font-medium">{proveedor.razonSocial}</TableCell>
                  <TableCell>{proveedor.cuit}</TableCell>
                  <TableCell>{nombreCondicionIva(proveedor.condicionIvaId)}</TableCell>
                  <TableCell>{proveedor.domicilio ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={proveedor.activo ? "success" : "default"}>
                      {proveedor.activo ? "Activo" : "Inactivo"}
                    </Badge>
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
