import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCrearPuntoVenta } from "@/lib/comprobantes-catalogo";
import { ApiError } from "@/lib/api-client";

const puntoVentaSchema = z.object({
  numero: z.coerce.number().int().positive("El numero tiene que ser mayor a 0"),
  nombre: z.string().min(1, "Ingresa un nombre"),
});

type PuntoVentaForm = z.infer<typeof puntoVentaSchema>;

interface NuevoPuntoVentaDialogProps {
  triggerLabel?: string;
}

/**
 * nota 08, seccion 2: la numeracion AFIP de los comprobantes es por punto de
 * venta de la empresa — sin al menos uno, no se puede cargar ningun
 * comprobante. No habia pantalla para esto todavia (solo POST /puntos-venta
 * por API), asi que se ofrece ac en el mismo punto donde hace falta.
 */
export function NuevoPuntoVentaDialog({ triggerLabel = "Crear punto de venta" }: NuevoPuntoVentaDialogProps) {
  const [open, setOpen] = useState(false);
  const crearPuntoVenta = useCrearPuntoVenta();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PuntoVentaForm>({ resolver: zodResolver(puntoVentaSchema), defaultValues: { numero: 1 } });

  const onSubmit = (values: PuntoVentaForm) => {
    crearPuntoVenta.mutate(values, {
      onSuccess: () => {
        toast.success("Punto de venta creado");
        reset();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo crear el punto de venta");
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo punto de venta</DialogTitle>
          <DialogDescription>Nota 08, seccion 2: numeracion AFIP de tus comprobantes.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="numero">Numero</Label>
            <Input id="numero" type="number" min={1} {...register("numero")} />
            {errors.numero && <p className="text-xs text-red-600">{errors.numero.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" placeholder="Casa Central" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearPuntoVenta.isPending}>
              {crearPuntoVenta.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
