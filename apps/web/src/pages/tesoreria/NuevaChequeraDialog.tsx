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
import { useCuentasBancarias, useCrearChequera } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const chequeraSchema = z
  .object({
    cuentaBancariaId: z.string().uuid("Elegi una cuenta bancaria"),
    numeroDesde: z.coerce.number().int().positive("Tiene que ser mayor a 0"),
    numeroHasta: z.coerce.number().int().positive("Tiene que ser mayor a 0"),
  })
  .refine((v) => v.numeroHasta >= v.numeroDesde, {
    message: "El numero hasta tiene que ser mayor o igual al numero desde",
    path: ["numeroHasta"],
  });

type ChequeraForm = z.infer<typeof chequeraSchema>;

interface NuevaChequeraDialogProps {
  triggerLabel?: string;
}

export function NuevaChequeraDialog({ triggerLabel = "Nueva chequera" }: NuevaChequeraDialogProps) {
  const [open, setOpen] = useState(false);
  const cuentasBancariasQuery = useCuentasBancarias();
  const crearChequera = useCrearChequera();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChequeraForm>({ resolver: zodResolver(chequeraSchema) });

  const onSubmit = (values: ChequeraForm) => {
    crearChequera.mutate(values, {
      onSuccess: () => {
        toast.success("Chequera creada");
        reset();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo crear la chequera");
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
        <Button size="sm" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva chequera</DialogTitle>
          <DialogDescription>Nota 22, seccion 6. Necesaria para emitir cheques propios.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="cuentaBancariaId">Cuenta bancaria</Label>
            <Select id="cuentaBancariaId" defaultValue="" {...register("cuentaBancariaId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {cuentasBancariasQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.banco})
                </option>
              ))}
            </Select>
            {errors.cuentaBancariaId && <p className="text-xs text-red-600">{errors.cuentaBancariaId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numeroDesde">Numero desde</Label>
              <Input id="numeroDesde" type="number" {...register("numeroDesde")} />
              {errors.numeroDesde && <p className="text-xs text-red-600">{errors.numeroDesde.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroHasta">Numero hasta</Label>
              <Input id="numeroHasta" type="number" {...register("numeroHasta")} />
              {errors.numeroHasta && <p className="text-xs text-red-600">{errors.numeroHasta.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearChequera.isPending}>
              {crearChequera.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
