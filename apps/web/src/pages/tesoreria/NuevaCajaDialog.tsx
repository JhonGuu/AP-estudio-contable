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
import { useCatalogos } from "@/lib/catalogos";
import { usePlanCuentas } from "@/lib/plan-cuentas";
import { useCrearCaja } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const cajaSchema = z.object({
  nombre: z.string().min(1, "Ingresa un nombre"),
  monedaId: z.string().uuid("Elegi una moneda"),
  cuentaContableId: z.string().uuid("Elegi una cuenta contable"),
});

type CajaForm = z.infer<typeof cajaSchema>;

/** Nota 22, seccion 6: `cuentaContableId` liga la caja a su cuenta del plan de cuentas (ACTIVO imputable). */
export function NuevaCajaDialog() {
  const [open, setOpen] = useState(false);
  const catalogosQuery = useCatalogos();
  const planCuentasQuery = usePlanCuentas({ tipo: "ACTIVO" });
  const crearCaja = useCrearCaja();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CajaForm>({ resolver: zodResolver(cajaSchema) });

  const onSubmit = (values: CajaForm) => {
    crearCaja.mutate(values, {
      onSuccess: () => {
        toast.success("Caja creada");
        reset();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo crear la caja");
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
        <Button size="sm">Nueva caja</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva caja</DialogTitle>
          <DialogDescription>Nota 22, seccion 6.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" placeholder="Caja chica" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monedaId">Moneda</Label>
            <Select id="monedaId" defaultValue="" {...register("monedaId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {catalogosQuery.data?.monedas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.simbolo})
                </option>
              ))}
            </Select>
            {errors.monedaId && <p className="text-xs text-red-600">{errors.monedaId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuentaContableId">Cuenta contable</Label>
            <Select id="cuentaContableId" defaultValue="" {...register("cuentaContableId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {planCuentasQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </Select>
            {errors.cuentaContableId && <p className="text-xs text-red-600">{errors.cuentaContableId.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearCaja.isPending}>
              {crearCaja.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
