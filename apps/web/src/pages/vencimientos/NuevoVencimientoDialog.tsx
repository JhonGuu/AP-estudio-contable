import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCrearVencimiento, TIPOS_VENCIMIENTO, ETIQUETA_TIPO_VENCIMIENTO } from "@/lib/vencimientos";
import { useUsuarios } from "@/lib/usuarios";
import { type Empresa } from "@/lib/empresas";
import { ApiError } from "@/lib/api-client";

const vencimientoSchema = z.object({
  empresaId: z.string().min(1, "Elegi el cliente"),
  tipo: z.enum(TIPOS_VENCIMIENTO),
  descripcion: z.string(),
  periodo: z.string(),
  fechaVencimiento: z.string().min(1, "Ingresa la fecha de vencimiento"),
  asignadoAUsuarioId: z.string(),
});

type VencimientoForm = z.infer<typeof vencimientoSchema>;

const VALORES_INICIALES: VencimientoForm = {
  empresaId: "",
  tipo: "IVA",
  descripcion: "",
  periodo: "",
  fechaVencimiento: "",
  asignadoAUsuarioId: "",
};

/**
 * Calendario de vencimientos multi-cliente (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3). A
 * diferencia de NuevaTareaDialog, el cliente es obligatorio (todo vencimiento
 * fiscal es de una empresa puntual) y el asignado es opcional.
 */
export function NuevoVencimientoDialog({ empresas }: { empresas: Empresa[] }) {
  const [open, setOpen] = useState(false);
  const usuariosQuery = useUsuarios();
  const crearVencimiento = useCrearVencimiento();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VencimientoForm>({
    resolver: zodResolver(vencimientoSchema),
    defaultValues: VALORES_INICIALES,
  });

  const onSubmit = (values: VencimientoForm) => {
    crearVencimiento.mutate(
      {
        empresaId: values.empresaId,
        tipo: values.tipo,
        descripcion: values.descripcion || null,
        periodo: values.periodo || null,
        fechaVencimiento: values.fechaVencimiento,
        asignadoAUsuarioId: values.asignadoAUsuarioId || null,
      },
      {
        onSuccess: () => {
          toast.success("Vencimiento registrado");
          reset(VALORES_INICIALES);
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el vencimiento");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(VALORES_INICIALES);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Nuevo vencimiento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo vencimiento</DialogTitle>
          <DialogDescription>Calendario de vencimientos. Siempre de un cliente puntual.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="empresaId">Cliente</Label>
            <Select id="empresaId" {...register("empresaId")}>
              <option value="">Elegi el cliente</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razonSocial}
                </option>
              ))}
            </Select>
            {errors.empresaId && <p className="text-xs text-red-600">{errors.empresaId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" {...register("tipo")}>
                {TIPOS_VENCIMIENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ETIQUETA_TIPO_VENCIMIENTO[tipo]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodo">Periodo (opcional)</Label>
              <Input id="periodo" placeholder="2026-09" {...register("periodo")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
            <Input id="fechaVencimiento" type="date" {...register("fechaVencimiento")} />
            {errors.fechaVencimiento && <p className="text-xs text-red-600">{errors.fechaVencimiento.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asignadoAUsuarioId">Asignado a (opcional)</Label>
            <Select id="asignadoAUsuarioId" {...register("asignadoAUsuarioId")}>
              <option value="">Sin asignar todavia</option>
              {usuariosQuery.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripcion (opcional)</Label>
            <Input id="descripcion" placeholder="DDJJ IVA septiembre" {...register("descripcion")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearVencimiento.isPending}>
              {crearVencimiento.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
