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
import { useCrearLibroSocietario, TIPOS_LIBRO_SOCIETARIO, ETIQUETA_TIPO_LIBRO_SOCIETARIO } from "@/lib/libros-societarios";
import { type Empresa } from "@/lib/empresas";
import { ApiError } from "@/lib/api-client";

const libroSchema = z.object({
  empresaId: z.string().min(1, "Elegi el cliente"),
  tipo: z.enum(TIPOS_LIBRO_SOCIETARIO),
  numero: z.string().min(1, "Ingresa el numero de libro"),
  cantidadFolios: z.string(),
  fechaRubrica: z.string(),
  ubicacion: z.string(),
  observaciones: z.string(),
});

type LibroForm = z.infer<typeof libroSchema>;

const VALORES_INICIALES: LibroForm = {
  empresaId: "",
  tipo: "ACTAS_DIRECTORIO",
  numero: "",
  cantidadFolios: "",
  fechaRubrica: "",
  ubicacion: "",
  observaciones: "",
};

/**
 * Libros societarios (gap nuevo, ver
 * claude/modulos-nacional-sistema-y-gap-estudio-contable.md, seccion 3). A
 * diferencia de NuevoVencimientoDialog no hay "asignado a" (no es una
 * obligacion con responsable, es un registro de ubicacion/estado de un
 * libro) pero si campos propios del tramite de rubrica (numero de libro,
 * folios, fecha de rubrica).
 */
export function NuevoLibroSocietarioDialog({ empresas }: { empresas: Empresa[] }) {
  const [open, setOpen] = useState(false);
  const crearLibro = useCrearLibroSocietario();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LibroForm>({
    resolver: zodResolver(libroSchema),
    defaultValues: VALORES_INICIALES,
  });

  const onSubmit = (values: LibroForm) => {
    crearLibro.mutate(
      {
        empresaId: values.empresaId,
        tipo: values.tipo,
        numero: Number(values.numero),
        cantidadFolios: values.cantidadFolios ? Number(values.cantidadFolios) : null,
        fechaRubrica: values.fechaRubrica || null,
        ubicacion: values.ubicacion || null,
        observaciones: values.observaciones || null,
      },
      {
        onSuccess: () => {
          toast.success("Libro societario registrado");
          reset(VALORES_INICIALES);
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el libro");
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
        <Button size="sm">Nuevo libro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo libro societario</DialogTitle>
          <DialogDescription>Registro de ubicacion y estado de un libro rubricado. Siempre de un cliente puntual.</DialogDescription>
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
              <Label htmlFor="tipo">Tipo de libro</Label>
              <Select id="tipo" {...register("tipo")}>
                {TIPOS_LIBRO_SOCIETARIO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ETIQUETA_TIPO_LIBRO_SOCIETARIO[tipo]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero">Numero de libro</Label>
              <Input id="numero" type="number" min="1" placeholder="3" {...register("numero")} />
              {errors.numero && <p className="text-xs text-red-600">{errors.numero.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cantidadFolios">Cantidad de folios (opcional)</Label>
              <Input id="cantidadFolios" type="number" min="1" placeholder="100" {...register("cantidadFolios")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fechaRubrica">Fecha de rubrica (opcional)</Label>
              <Input id="fechaRubrica" type="date" {...register("fechaRubrica")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ubicacion">Ubicacion (opcional)</Label>
            <Input id="ubicacion" placeholder="Archivo del estudio" {...register("ubicacion")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Input id="observaciones" {...register("observaciones")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearLibro.isPending}>
              {crearLibro.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
