import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTareas, ETIQUETA_ESTADO_TAREA, ESTADOS_TAREA, type EstadoTarea } from "@/lib/tareas";
import { useUsuarios } from "@/lib/usuarios";
import { useEmpresas } from "@/lib/empresas";
import { formatFechaISO } from "@/lib/fecha";
import { NuevaTareaDialog } from "./NuevaTareaDialog";
import { TareaDetalleDialog } from "./TareaDetalleDialog";

const VARIANTE_ESTADO: Record<EstadoTarea, "default" | "success" | "warning" | "destructive"> = {
  PENDIENTE: "default",
  EN_PROCESO: "warning",
  COMPLETADA: "success",
  CANCELADA: "destructive",
};

const TODAS = "";

/**
 * Gestion del estudio (gap nuevo, ver claude/modulos-nacional-sistema-y-gap-estudio-contable.md).
 * A diferencia del resto de los modulos, esta pagina NO depende de la
 * "empresa activa" de la sesion: muestra las tareas de todo el estudio, con
 * un filtro opcional por cliente.
 */
export function EstudioPage() {
  const [filtroEmpresa, setFiltroEmpresa] = useState(TODAS);
  const [filtroAsignado, setFiltroAsignado] = useState(TODAS);
  const [filtroEstado, setFiltroEstado] = useState(TODAS);
  const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState<string | null>(null);

  const empresasQuery = useEmpresas();
  const usuariosQuery = useUsuarios();
  const tareasQuery = useTareas({
    empresaId: filtroEmpresa || undefined,
    asignadoAUsuarioId: filtroAsignado || undefined,
    estado: (filtroEstado || undefined) as EstadoTarea | undefined,
  });

  const nombreCliente = (empresaId: string | null) => {
    if (!empresaId) return "Interna";
    return empresasQuery.data?.find((e) => e.id === empresaId)?.razonSocial ?? "-";
  };

  const nombreUsuario = (usuarioId: string) => {
    const u = usuariosQuery.data?.find((u) => u.id === usuarioId);
    return u ? `${u.nombre} ${u.apellido}` : "-";
  };

  // Deriva del listado vivo (no de una copia local) para que la grilla de
  // checklist y el estado del dialog se mantengan al dia despues de cada
  // mutacion (cambiar estado, agregar/marcar item invalidan ["tareas"]).
  const tareaAbierta = tareaSeleccionadaId
    ? (tareasQuery.data?.find((t) => t.id === tareaSeleccionadaId) ?? null)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Gestion del estudio</h1>
          <p className="text-sm text-slate-500">Tareas internas del equipo, por cliente o del estudio en general.</p>
        </div>
        <NuevaTareaDialog empresas={empresasQuery.data ?? []} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Cliente</label>
          <Select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value={TODAS}>Todos</option>
            {empresasQuery.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razonSocial}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Asignada a</label>
          <Select value={filtroAsignado} onChange={(e) => setFiltroAsignado(e.target.value)}>
            <option value={TODAS}>Todos</option>
            {usuariosQuery.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500">Estado</label>
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value={TODAS}>Todos</option>
            {ESTADOS_TAREA.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_TAREA[estado]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {tareasQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : tareasQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar las tareas.</p>
        ) : tareasQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay tareas. Crea la primera.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Asignada a</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tareasQuery.data?.map((tarea) => {
                const completados = tarea.items.filter((i) => i.completado).length;
                return (
                  <TableRow key={tarea.id}>
                    <TableCell className="font-medium">{tarea.titulo}</TableCell>
                    <TableCell>{nombreCliente(tarea.empresaId)}</TableCell>
                    <TableCell>{nombreUsuario(tarea.asignadoAUsuarioId)}</TableCell>
                    <TableCell>{tarea.fechaLimite ? formatFechaISO(tarea.fechaLimite) : "-"}</TableCell>
                    <TableCell>{tarea.items.length > 0 ? `${completados}/${tarea.items.length}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={VARIANTE_ESTADO[tarea.estado]}>{ETIQUETA_ESTADO_TAREA[tarea.estado]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setTareaSeleccionadaId(tarea.id)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <TareaDetalleDialog
        tarea={tareaAbierta}
        nombreCliente={tareaAbierta ? nombreCliente(tareaAbierta.empresaId) : ""}
        nombreAsignado={tareaAbierta ? nombreUsuario(tareaAbierta.asignadoAUsuarioId) : ""}
        onOpenChange={(open) => {
          if (!open) setTareaSeleccionadaId(null);
        }}
      />
    </div>
  );
}
