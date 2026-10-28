import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCrearTarea } from "@/lib/tareas";
import { useUsuarios } from "@/lib/usuarios";
import { useEmpresas, type Empresa } from "@/lib/empresas";
import { ApiError } from "@/lib/api-client";

const SIN_CLIENTE = "";

const tareaSchema = z.object({
  empresaId: z.string(),
  titulo: z.string().min(1, "Ingresa un titulo"),
  descripcion: z.string(),
  asignadoAUsuarioId: z.string().min(1, "Elegi a quien se la asignas"),
  fechaLimite: z.string(),
});

type TareaForm = z.infer<typeof tareaSchema>;

/**
 * Gestion del estudio (gap nuevo, ver claude/modulos-nacional-sistema-y-gap-estudio-contable.md,
 * seccion 3, "Gestion de tareas internas del estudio"). Una tarea puede ser
 * para un cliente puntual o interna del estudio (sin empresa).
 */
export function NuevaTareaDialog({ empresas }: { empresas: Empresa[] }) {
  const [open, setOpen] = useState(false);
  const usuariosQuery = useUsuarios();
  const crearTarea = useCrearTarea();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TareaForm>({
    resolver: zodResolver(tareaSchema),
    defaultValues: { empresaId: SIN_CLIENTE, titulo: "", descripcion: "", asignadoAUsuarioId: "", fechaLimite: "" },
  });

  const onSubmit = (values: TareaForm) => {
    crearTarea.mutate(
      {
        empresaId: values.empresaId || null,
        titulo: values.titulo,
        descripcion: values.descripcion || null,
        asignadoAUsuarioId: values.asignadoAUsuarioId,
        fechaLimite: values.fechaLimite || null,
      },
      {
        onSuccess: () => {
          toast.success("Tarea creada");
          reset({ empresaId: SIN_CLIENTE, titulo: "", descripcion: "", asignadoAUsuarioId: "", fechaLimite: "" });
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo crear la tarea");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset({ empresaId: SIN_CLIENTE, titulo: "", descripcion: "", asignadoAUsuarioId: "", fechaLimite: "" });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Nueva tarea</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Gestion del estudio. Para un cliente puntual o interna del equipo.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Titulo</Label>
            <Input id="titulo" placeholder="DDJJ IVA octubre" {...register("titulo")} />
            {errors.titulo && <p className="text-xs text-red-600">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="empresaId">Cliente</Label>
            <Select id="empresaId" {...register("empresaId")}>
              <option value={SIN_CLIENTE}>Interna del estudio (sin cliente)</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razonSocial}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asignadoAUsuarioId">Asignada a</Label>
            <Select id="asignadoAUsuarioId" {...register("asignadoAUsuarioId")}>
              <option value="">Elegi quien la hace</option>
              {usuariosQuery.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </Select>
            {errors.asignadoAUsuarioId && <p className="text-xs text-red-600">{errors.asignadoAUsuarioId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fechaLimite">Fecha limite (opcional)</Label>
            <Input id="fechaLimite" type="date" {...register("fechaLimite")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripcion (opcional)</Label>
            <Textarea id="descripcion" rows={3} {...register("descripcion")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearTarea.isPending}>
              {crearTarea.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
