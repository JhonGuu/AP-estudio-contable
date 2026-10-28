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
import {
  useEditarLibroSocietario,
  ESTADOS_LIBRO_SOCIETARIO,
  ETIQUETA_ESTADO_LIBRO_SOCIETARIO,
  type LibroSocietario,
} from "@/lib/libros-societarios";
import { ApiError } from "@/lib/api-client";

const editarSchema = z.object({
  estado: z.enum(ESTADOS_LIBRO_SOCIETARIO),
  ultimoFolioUtilizado: z.string(),
  ubicacion: z.string(),
  observaciones: z.string(),
});

type EditarForm = z.infer<typeof editarSchema>;

/**
 * Libros societarios: a diferencia del toggle simple de Vencimientos, un
 * libro tiene varios campos que se actualizan con el tiempo (ubicacion,
 * folio utilizado, estado) — un solo dialogo de edicion en vez de una accion
 * por campo, sin reglas de transicion entre estados.
 */
export function EditarLibroSocietarioDialog({ libro }: { libro: LibroSocietario }) {
  const [open, setOpen] = useState(false);
  const editarLibro = useEditarLibroSocietario();

  const valoresIniciales: EditarForm = {
    estado: libro.estado,
    ultimoFolioUtilizado: libro.ultimoFolioUtilizado ? String(libro.ultimoFolioUtilizado) : "",
    ubicacion: libro.ubicacion ?? "",
    observaciones: libro.observaciones ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<EditarForm>({
    resolver: zodResolver(editarSchema),
    defaultValues: valoresIniciales,
  });

  const onSubmit = (values: EditarForm) => {
    editarLibro.mutate(
      {
        id: libro.id,
        estado: values.estado,
        ultimoFolioUtilizado: values.ultimoFolioUtilizado ? Number(values.ultimoFolioUtilizado) : null,
        ubicacion: values.ubicacion || null,
        observaciones: values.observaciones || null,
      },
      {
        onSuccess: () => {
          toast.success("Libro actualizado");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el libro");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(valoresIniciales);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar libro societario</DialogTitle>
          <DialogDescription>Numero {libro.numero} — actualiza estado, ubicacion u observaciones.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado</Label>
              <Select id="estado" {...register("estado")}>
                {ESTADOS_LIBRO_SOCIETARIO.map((estado) => (
                  <option key={estado} value={estado}>
                    {ETIQUETA_ESTADO_LIBRO_SOCIETARIO[estado]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ultimoFolioUtilizado">Ultimo folio utilizado</Label>
              <Input id="ultimoFolioUtilizado" type="number" min="1" {...register("ultimoFolioUtilizado")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ubicacion">Ubicacion</Label>
            <Input id="ubicacion" placeholder="Archivo del estudio" {...register("ubicacion")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" {...register("observaciones")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={editarLibro.isPending}>
              {editarLibro.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
