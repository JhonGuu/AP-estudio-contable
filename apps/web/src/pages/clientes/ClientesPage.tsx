import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCatalogos } from "@/lib/catalogos";
import { useClientes } from "@/lib/clientes";
import { NuevoClienteDialog } from "./NuevoClienteDialog";

export function ClientesPage() {
  const clientesQuery = useClientes();
  const catalogosQuery = useCatalogos();

  const nombreCondicionIva = (id: string) =>
    catalogosQuery.data?.condicionesIva.find((c) => c.id === id)?.nombre ?? "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-slate-500">Nota 08, seccion 2 (espejo de proveedores).</p>
        </div>
        <NuevoClienteDialog />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {clientesQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : clientesQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los clientes.</p>
        ) : clientesQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay clientes. Creá el primero.</p>
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
              {clientesQuery.data?.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.razonSocial}</TableCell>
                  <TableCell>{cliente.cuit}</TableCell>
                  <TableCell>{nombreCondicionIva(cliente.condicionIvaId)}</TableCell>
                  <TableCell>{cliente.domicilio ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.activo ? "success" : "default"}>
                      {cliente.activo ? "Activo" : "Inactivo"}
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
