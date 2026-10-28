import { useState } from "react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useLibrosSocietarios,
  useEliminarLibroSocietario,
  ETIQUETA_TIPO_LIBRO_SOCIETARIO,
  ETIQUETA_ESTADO_LIBRO_SOCIETARIO,
  TIPOS_LIBRO_SOCIETARIO,
  ESTADOS_LIBRO_SOCIETARIO,
  type EstadoLibroSocietario,
  type TipoLibroSocietario,
} from "@/lib/libros-societarios";
import { useEmpresas } from "@/lib/empresas";
import { formatFechaISO } from "@/lib/fecha";
import { ApiError } from "@/lib/api-client";
import { NuevoLibroSocietarioDialog } from "./NuevoLibroSocietarioDialog";
import { EditarLibroSocietarioDialog } from "./EditarLibroSocietarioDialog";

const TODOS = "";

const VARIANTE_ESTADO: Record<EstadoLibroSocietario, "default" | "success" | "warning" | "destructive"> = {
  EN_USO: "default",
  COMPLETO: "warning",
  EXTRAVIADO: "destructive",
};

/**
 * Libros societarios (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * Cuarta y ultima pieza de "Gestion del estudio": registro y seguimiento de
 * ubicacion/estado de los libros rubricados de cada cliente (actas de
 * directorio/asamblea, registro de acciones, diario, etc.) — tablero manual,
 * sin ningun calculo ni integracion con el organismo rubricante.
 */
export function LibrosSocietariosPage() {
  const [filtroEmpresa, setFiltroEmpresa] = useState(TODOS);
  const [filtroTipo, setFiltroTipo] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);

  const empresasQuery = useEmpresas();
  const librosQuery = useLibrosSocietarios({
    empresaId: filtroEmpresa || undefined,
    tipo: (filtroTipo || undefined) as TipoLibroSocietario | undefined,
    estado: (filtroEstado || undefined) as EstadoLibroSocietario | undefined,
  });
  const eliminarLibro = useEliminarLibroSocietario();

  const nombreCliente = (empresaId: string) => empresasQuery.data?.find((e) => e.id === empresaId)?.razonSocial ?? "-";

  const onEliminar = (id: string) => {
    if (!window.confirm("¿Eliminar este libro societario? No se puede deshacer.")) return;
    eliminarLibro.mutate(id, {
      onSuccess: () => toast.success("Libro eliminado"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el libro"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Libros societarios</h1>
          <p className="text-sm text-slate-500">
            Registro y seguimiento de ubicacion y estado de los libros rubricados de cada cliente.
          </p>
        </div>
        <NuevoLibroSocietarioDialog empresas={empresasQuery.data ?? []} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Cliente</Label>
          <Select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {empresasQuery.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razonSocial}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Tipo</Label>
          <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {TIPOS_LIBRO_SOCIETARIO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_LIBRO_SOCIETARIO[tipo]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Estado</Label>
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {ESTADOS_LIBRO_SOCIETARIO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_LIBRO_SOCIETARIO[estado]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {librosQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : librosQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los libros societarios.</p>
        ) : librosQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay libros societarios registrados. Crea el primero.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>N° libro</TableHead>
                <TableHead>Folios</TableHead>
                <TableHead>Fecha de rubrica</TableHead>
                <TableHead>Ubicacion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {librosQuery.data?.map((libro) => (
                <TableRow key={libro.id} className={libro.estado === "EXTRAVIADO" ? "bg-red-50" : undefined}>
                  <TableCell className="font-medium">{nombreCliente(libro.empresaId)}</TableCell>
                  <TableCell>{ETIQUETA_TIPO_LIBRO_SOCIETARIO[libro.tipo]}</TableCell>
                  <TableCell>{libro.numero}</TableCell>
                  <TableCell>
                    {libro.ultimoFolioUtilizado ? `${libro.ultimoFolioUtilizado} / ` : ""}
                    {libro.cantidadFolios ?? "-"}
                  </TableCell>
                  <TableCell>{libro.fechaRubrica ? formatFechaISO(libro.fechaRubrica) : "-"}</TableCell>
                  <TableCell>{libro.ubicacion ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE_ESTADO[libro.estado]}>{ETIQUETA_ESTADO_LIBRO_SOCIETARIO[libro.estado]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <EditarLibroSocietarioDialog libro={libro} />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={eliminarLibro.isPending}
                        onClick={() => onEliminar(libro.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
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
