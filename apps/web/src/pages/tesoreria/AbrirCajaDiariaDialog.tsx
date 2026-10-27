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
import { useAbrirCajaDiaria, type Caja } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const abrirSchema = z.object({
  cajaId: z.string().min(1, "Elegi una caja"),
  fecha: z.string().min(1, "Elegi una fecha"),
});

type AbrirForm = z.infer<typeof abrirSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Nota 22, seccion 6: abre un turno nuevo para una caja que no tenga uno abierto. */
export function AbrirCajaDiariaDialog({ cajasDisponibles }: { cajasDisponibles: Caja[] }) {
  const [open, setOpen] = useState(false);
  const abrirCajaDiaria = useAbrirCajaDiaria();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AbrirForm>({ resolver: zodResolver(abrirSchema), defaultValues: { fecha: hoyISO() } });

  const onSubmit = (values: AbrirForm) => {
    abrirCajaDiaria.mutate(values, {
      onSuccess: () => {
        toast.success("Turno de caja abierto");
        reset({ fecha: hoyISO() });
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo abrir el turno");
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset({ fecha: hoyISO() });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={cajasDisponibles.length === 0}>
          Abrir turno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir turno de caja</DialogTitle>
          <DialogDescription>
            Nota 22, seccion 6. El saldo de apertura es el saldo actual de la caja.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="cajaId">Caja</Label>
            <Select id="cajaId" {...register("cajaId")}>
              <option value="">Elegi una caja</option>
              {cajasDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            {errors.cajaId && <p className="text-xs text-red-600">{errors.cajaId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={abrirCajaDiaria.isPending}>
              {abrirCajaDiaria.isPending ? "Abriendo..." : "Abrir turno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
