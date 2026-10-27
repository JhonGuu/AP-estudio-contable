import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCerrarCajaDiaria, type CajaDiaria } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const cerrarSchema = z.object({
  fecha: z.string().min(1, "Elegi una fecha"),
  totalContado: z.coerce.number().min(0, "No puede ser negativo"),
});

type CerrarForm = z.infer<typeof cerrarSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface CerrarCajaDiariaDialogProps {
  turno: CajaDiaria | null;
  nombreCaja: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Nota 22, seccion 6: pide el arqueo (conteo fisico) y lo compara contra el
 * saldo teorico de la caja en este momento. Si difieren, el backend genera
 * automaticamente un AJUSTE de fondo — no hace falta cargarlo a mano.
 */
export function CerrarCajaDiariaDialog({ turno, nombreCaja, onOpenChange }: CerrarCajaDiariaDialogProps) {
  const cerrarCajaDiaria = useCerrarCajaDiaria();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CerrarForm>({ resolver: zodResolver(cerrarSchema), defaultValues: { fecha: hoyISO() } });

  useEffect(() => {
    if (turno) reset({ fecha: hoyISO(), totalContado: undefined });
  }, [turno, reset]);

  if (!turno) return null;

  const onSubmit = (values: CerrarForm) => {
    cerrarCajaDiaria.mutate(
      { id: turno.id, input: values },
      {
        onSuccess: (resultado) => {
          const diferencia = Number(resultado.diferencia ?? 0);
          if (Math.abs(diferencia) > 0.005) {
            toast.success(`Turno cerrado con una diferencia de $ ${diferencia.toFixed(2)} — se genero un ajuste`);
          } else {
            toast.success("Turno cerrado, sin diferencias");
          }
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo cerrar el turno");
        },
      },
    );
  };

  return (
    <Dialog open={!!turno} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar turno — {nombreCaja}</DialogTitle>
          <DialogDescription>
            Abierto el {new Date(turno.fechaApertura).toLocaleDateString("es-AR")} con $ {turno.saldoApertura.toFixed(2)}
            . Contá la plata y cargá el total.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="totalContado">Total contado (arqueo)</Label>
            <Input id="totalContado" type="number" step="0.01" {...register("totalContado")} />
            {errors.totalContado && <p className="text-xs text-red-600">{errors.totalContado.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha de cierre</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cerrarCajaDiaria.isPending}>
              {cerrarCajaDiaria.isPending ? "Cerrando..." : "Cerrar turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
