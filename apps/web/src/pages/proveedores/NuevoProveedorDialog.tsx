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
import { useCrearProveedor } from "@/lib/proveedores";
import { ApiError } from "@/lib/api-client";

const proveedorSchema = z.object({
  razonSocial: z.string().min(2, "Ingresa la razon social"),
  cuit: z.string().regex(/^\d{11}$/, "El CUIT debe tener 11 digitos, sin guiones"),
  condicionIvaId: z.string().uuid("Elegi una condicion de IVA"),
  domicilio: z.string().optional(),
});

type ProveedorForm = z.infer<typeof proveedorSchema>;

export function NuevoProveedorDialog() {
  const [open, setOpen] = useState(false);
  const catalogosQuery = useCatalogos();
  const crearProveedor = useCrearProveedor();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProveedorForm>({ resolver: zodResolver(proveedorSchema) });

  const onSubmit = (values: ProveedorForm) => {
    crearProveedor.mutate(
      { ...values, domicilio: values.domicilio || null },
      {
        onSuccess: () => {
          toast.success("Proveedor creado");
          reset();
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo crear el proveedor");
        },
      },
    );
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
        <Button>Nuevo proveedor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>Nota 08, seccion 2: datos basicos para poder facturarle despues.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="razonSocial">Razon social</Label>
            <Input id="razonSocial" {...register("razonSocial")} />
            {errors.razonSocial && <p className="text-xs text-red-600">{errors.razonSocial.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT</Label>
            <Input id="cuit" placeholder="20304050607" {...register("cuit")} />
            {errors.cuit && <p className="text-xs text-red-600">{errors.cuit.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="condicionIvaId">Condicion de IVA</Label>
            <Select id="condicionIvaId" defaultValue="" {...register("condicionIvaId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {catalogosQuery.data?.condicionesIva.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            {errors.condicionIvaId && <p className="text-xs text-red-600">{errors.condicionIvaId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="domicilio">Domicilio (opcional)</Label>
            <Input id="domicilio" {...register("domicilio")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearProveedor.isPending}>
              {crearProveedor.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
