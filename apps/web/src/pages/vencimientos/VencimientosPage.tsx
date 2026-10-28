import { useState } from "react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useVencimientos,
  useMarcarEstadoVencimiento,
  useEliminarVencimiento,
  esVencimientoVencido,
  ETIQUETA_TIPO_VENCIMIENTO,
  ETIQUETA_ESTADO_VENCIMIENTO,
  TIPOS_VENCIMIENTO,
  ESTADOS_VENCIMIENTO,
  type EstadoVencimiento,
} from "@/lib/vencimientos";
import { useUsuarios } from "@/lib/usuarios";
import { useEmpresas } from "@/lib/empresas";
import { formatFechaISO } from "@/lib/fecha";
import { ApiError } from "@/lib/api-client";
import { NuevoVencimientoDialog } from "./NuevoVencimientoDialog";

const TODOS = "";

/**
 * Calendario de vencimientos multi-cliente (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3).
 * Segunda pieza de "Gestion del estudio" — tablero a nivel estudio (no pide
 * empresa activa), ordenado por fecha de vencimiento ascendente para que se
 * lea como un calendario: lo que vence antes aparece primero.
 */
export function VencimientosPage() {
  const [filtroEmpresa, setFiltroEmpresa] = useState(TODOS);
  const [filtroTipo, setFiltroTipo] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const empresasQuery = useEmpresas();
  const usuariosQuery = useUsuarios();
  const vencimientosQuery = useVencimientos({
    empresaId: filtroEmpresa || undefined,
    tipo: (filtroTipo || undefined) as (typeof TIPOS_VENCIMIENTO)[number] | undefined,
    estado: (filtroEstado || undefined) as EstadoVencimiento | undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });
  const marcarEstado = useMarcarEstadoVencimiento();
  const eliminarVencimiento = useEliminarVencimiento();

  const nombreCliente = (empresaId: string) => empresasQuery.data?.find((e) => e.id === empresaId)?.razonSocial ?? "-";

  const nombreUsuario = (usuarioId: string | null) => {
    if (!usuarioId) return "Sin asignar";
    const u = usuariosQuery.data?.find((u) => u.id === usuarioId);
    return u ? `${u.nombre} ${u.apellido}` : "-";
  };

  const onCambiarEstado = (id: string, estadoActual: EstadoVencimiento) => {
    const estadoNuevo: EstadoVencimiento = estadoActual === "PENDIENTE" ? "CUMPLIDO" : "PENDIENTE";
    marcarEstado.mutate(
      { id, estado: estadoNuevo },
      {
        onSuccess: () => toast.success(estadoNuevo === "CUMPLIDO" ? "Vencimiento marcado como cumplido" : "Vencimiento vuelto a pendiente"),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el vencimiento"),
      },
    );
  };

  const onEliminar = (id: string) => {
    if (!window.confirm("¿Eliminar este vencimiento? No se puede deshacer.")) return;
    eliminarVencimiento.mutate(id, {
      onSuccess: () => toast.success("Vencimiento eliminado"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar el vencimiento"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Vencimientos</h1>
          <p className="text-sm text-slate-500">Calendario de vencimientos impositivos de todos los clientes del estudio.</p>
        </div>
        <NuevoVencimientoDialog empresas={empresasQuery.data ?? []} />
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
            {TIPOS_VENCIMIENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_VENCIMIENTO[tipo]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Estado</Label>
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {ESTADOS_VENCIMIENTO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_VENCIMIENTO[estado]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desde" className="text-xs font-medium text-slate-500">
            Desde
          </Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hasta" className="text-xs font-medium text-slate-500">
            Hasta
          </Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {vencimientosQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Cargando...</p>
        ) : vencimientosQuery.isError ? (
          <p className="p-6 text-sm text-red-600">No se pudieron cargar los vencimientos.</p>
        ) : vencimientosQuery.data?.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Todavia no hay vencimientos registrados. Crea el primero.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripcion / Periodo</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vencimientosQuery.data?.map((vencimiento) => {
                const vencido = esVencimientoVencido(vencimiento);
                return (
                  <TableRow key={vencimiento.id} className={vencido ? "bg-red-50" : undefined}>
                    <TableCell className="font-medium">{nombreCliente(vencimiento.empresaId)}</TableCell>
                    <TableCell>{ETIQUETA_TIPO_VENCIMIENTO[vencimiento.tipo]}</TableCell>
                    <TableCell>
                      {[vencimiento.descripcion, vencimiento.periodo].filter(Boolean).join(" · ") || "-"}
                    </TableCell>
                    <TableCell className={vencido ? "font-medium text-red-700" : undefined}>
                      {formatFechaISO(vencimiento.fechaVencimiento)}
                    </TableCell>
                    <TableCell>{nombreUsuario(vencimiento.asignadoAUsuarioId)}</TableCell>
                    <TableCell>
                      {vencido ? (
                        <Badge variant="destructive">Vencido</Badge>
                      ) : (
                        <Badge variant={vencimiento.estado === "CUMPLIDO" ? "success" : "default"}>
                          {ETIQUETA_ESTADO_VENCIMIENTO[vencimiento.estado]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={marcarEstado.isPending}
                          onClick={() => onCambiarEstado(vencimiento.id, vencimiento.estado)}
                        >
                          {vencimiento.estado === "PENDIENTE" ? "Marcar cumplido" : "Volver a pendiente"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={eliminarVencimiento.isPending}
                          onClick={() => onEliminar(vencimiento.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
