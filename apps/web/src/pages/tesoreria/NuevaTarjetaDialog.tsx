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
import { useCuentasBancarias, useCrearTarjeta } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const tarjetaSchema = z.object({
  nombre: z.string().min(1, "Ingresa un nombre"),
  cuentaLiquidadoraId: z.string().uuid("Elegi una cuenta liquidadora"),
});

type TarjetaForm = z.infer<typeof tarjetaSchema>;

/** `cuentaLiquidadoraId` es una CuentaBancaria existente (el banco que liquida las ventas con tarjeta), no una cuenta del plan de cuentas. */
export function NuevaTarjetaDialog() {
  const [open, setOpen] = useState(false);
  const cuentasBancariasQuery = useCuentasBancarias();
  const crearTarjeta = useCrearTarjeta();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TarjetaForm>({ resolver: zodResolver(tarjetaSchema) });

  const onSubmit = (values: TarjetaForm) => {
    crearTarjeta.mutate(values, {
      onSuccess: () => {
        toast.success("Tarjeta creada");
        reset();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo crear la tarjeta");
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
        <Button size="sm">Nueva tarjeta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarjeta</DialogTitle>
          <DialogDescription>Nota 22, seccion 6.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" placeholder="Posnet Visa/Mastercard" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuentaLiquidadoraId">Cuenta bancaria liquidadora</Label>
            <Select id="cuentaLiquidadoraId" defaultValue="" {...register("cuentaLiquidadoraId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {cuentasBancariasQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.banco})
                </option>
              ))}
            </Select>
            {errors.cuentaLiquidadoraId && <p className="text-xs text-red-600">{errors.cuentaLiquidadoraId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearTarjeta.isPending}>
              {crearTarjeta.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
