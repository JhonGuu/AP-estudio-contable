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
import { useCrearEmpresa } from "@/lib/empresas";
import { ApiError } from "@/lib/api-client";

const empresaSchema = z.object({
  razonSocial: z.string().min(2, "Ingresa la razon social"),
  nombreComercial: z.string().optional(),
  cuit: z.string().regex(/^\d{11}$/, "El CUIT debe tener 11 digitos, sin guiones"),
  condicionIvaId: z.string().uuid("Elegi una condicion de IVA"),
  domicilioFiscal: z.string().min(1, "Ingresa el domicilio fiscal"),
  provinciaId: z.string().uuid("Elegi una provincia"),
  actividadAfip: z.string().min(1, "Ingresa el codigo de actividad AFIP").max(10),
  monedaBaseId: z.string().uuid("Elegi la moneda base"),
  cierreEjercicio: z
    .string()
    .regex(/^\d{2}-\d{2}$/, "Formato MM-DD, ej: 12-31"),
});

type EmpresaForm = z.infer<typeof empresaSchema>;

interface NuevaEmpresaDialogProps {
  /** Texto del boton que abre el dialog — distinto segun si ya tiene empresas o es la primera. */
  triggerLabel?: string;
}

export function NuevaEmpresaDialog({ triggerLabel = "Crear empresa nueva" }: NuevaEmpresaDialogProps) {
  const [open, setOpen] = useState(false);
  const catalogosQuery = useCatalogos();
  const crearEmpresa = useCrearEmpresa();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { cierreEjercicio: "12-31" },
  });

  const onSubmit = (values: EmpresaForm) => {
    crearEmpresa.mutate(
      { ...values, nombreComercial: values.nombreComercial || null },
      {
        onSuccess: () => {
          toast.success("Empresa creada. Ya la podes elegir en la lista.");
          reset();
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo crear la empresa");
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
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
          <DialogDescription>
            Nota 06, seccion 4: te asigna como OWNER automaticamente y activa el plan de cuentas de fabrica.
          </DialogDescription>
        </DialogHeader>

        <form className="max-h-[70vh] space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="razonSocial">Razon social</Label>
            <Input id="razonSocial" {...register("razonSocial")} />
            {errors.razonSocial && <p className="text-xs text-red-600">{errors.razonSocial.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nombreComercial">Nombre comercial (opcional)</Label>
            <Input id="nombreComercial" {...register("nombreComercial")} />
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
            <Label htmlFor="domicilioFiscal">Domicilio fiscal</Label>
            <Input id="domicilioFiscal" {...register("domicilioFiscal")} />
            {errors.domicilioFiscal && <p className="text-xs text-red-600">{errors.domicilioFiscal.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provinciaId">Provincia</Label>
            <Select id="provinciaId" defaultValue="" {...register("provinciaId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {catalogosQuery.data?.provincias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            {errors.provinciaId && <p className="text-xs text-red-600">{errors.provinciaId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actividadAfip">Codigo de actividad AFIP</Label>
            <Input id="actividadAfip" placeholder="692000" {...register("actividadAfip")} />
            {errors.actividadAfip && <p className="text-xs text-red-600">{errors.actividadAfip.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monedaBaseId">Moneda base</Label>
            <Select id="monedaBaseId" defaultValue="" {...register("monedaBaseId")}>
              <option value="" disabled>
                Elegi una opcion
              </option>
              {catalogosQuery.data?.monedas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.codigo})
                </option>
              ))}
            </Select>
            {errors.monedaBaseId && <p className="text-xs text-red-600">{errors.monedaBaseId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cierreEjercicio">Cierre de ejercicio (MM-DD)</Label>
            <Input id="cierreEjercicio" placeholder="12-31" {...register("cierreEjercicio")} />
            {errors.cierreEjercicio && <p className="text-xs text-red-600">{errors.cierreEjercicio.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearEmpresa.isPending}>
              {crearEmpresa.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
