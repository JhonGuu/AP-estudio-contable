import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  useAgregarItemChecklist,
  useCambiarEstadoTarea,
  useMarcarItemChecklist,
  transicionesDisponibles,
  ETIQUETA_ESTADO_TAREA,
  type EstadoTarea,
  type Tarea,
} from "@/lib/tareas";
import { ApiError } from "@/lib/api-client";
import { formatFechaISO } from "@/lib/fecha";

const VARIANTE_ESTADO: Record<EstadoTarea, "default" | "success" | "warning" | "destructive"> = {
  PENDIENTE: "default",
  EN_PROCESO: "warning",
  COMPLETADA: "success",
  CANCELADA: "destructive",
};

interface TareaDetalleDialogProps {
  tarea: Tarea | null;
  nombreCliente: string;
  nombreAsignado: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Checklist/mini-tareas (nota del gap: "listas de verificacion compartibles
 * con empleados") modelado como items dentro de la tarea — se agregan y
 * marcan desde aca, no hace falta una pantalla aparte.
 */
export function TareaDetalleDialog({ tarea, nombreCliente, nombreAsignado, onOpenChange }: TareaDetalleDialogProps) {
  const [nuevoItem, setNuevoItem] = useState("");
  const cambiarEstado = useCambiarEstadoTarea();
  const agregarItem = useAgregarItemChecklist();
  const marcarItem = useMarcarItemChecklist();

  if (!tarea) return null;

  const onCambiarEstado = (estado: EstadoTarea) => {
    cambiarEstado.mutate(
      { id: tarea.id, estado },
      {
        onSuccess: () => toast.success(`Tarea marcada como ${ETIQUETA_ESTADO_TAREA[estado].toLowerCase()}`),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo cambiar el estado"),
      },
    );
  };

  const onAgregarItem = () => {
    if (!nuevoItem.trim()) return;
    agregarItem.mutate(
      { tareaId: tarea.id, descripcion: nuevoItem.trim() },
      {
        onSuccess: () => setNuevoItem(""),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo agregar el item"),
      },
    );
  };

  const onToggleItem = (itemId: string, completado: boolean) => {
    marcarItem.mutate(
      { itemId, completado },
      {
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el item"),
      },
    );
  };

  return (
    <Dialog open={!!tarea} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tarea.titulo}</DialogTitle>
          <DialogDescription>
            {nombreCliente} · Asignada a {nombreAsignado}
            {tarea.fechaLimite && ` · vence ${formatFechaISO(tarea.fechaLimite)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tarea.descripcion && <p className="text-sm text-slate-600">{tarea.descripcion}</p>}

          <div className="flex items-center gap-2">
            <Badge variant={VARIANTE_ESTADO[tarea.estado]}>{ETIQUETA_ESTADO_TAREA[tarea.estado]}</Badge>
            {transicionesDisponibles(tarea.estado).map((estado) => (
              <Button
                key={estado}
                size="sm"
                variant="outline"
                disabled={cambiarEstado.isPending}
                onClick={() => onCambiarEstado(estado)}
              >
                Marcar {ETIQUETA_ESTADO_TAREA[estado].toLowerCase()}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Checklist</p>
            {tarea.items.length === 0 ? (
              <p className="text-xs text-slate-400">Sin items todavia.</p>
            ) : (
              <ul className="space-y-1.5">
                {tarea.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.completado}
                      onChange={(e) => onToggleItem(item.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className={item.completado ? "text-slate-400 line-through" : "text-slate-700"}>
                      {item.descripcion}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Agregar item..."
                value={nuevoItem}
                onChange={(e) => setNuevoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAgregarItem();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={onAgregarItem} disabled={agregarItem.isPending}>
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
