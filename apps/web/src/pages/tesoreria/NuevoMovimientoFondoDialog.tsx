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
import { useCajas, useCuentasBancarias, useCrearMovimientoFondo, type TipoCuentaFondo } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const NINGUNA = "";

const movimientoSchema = z.object({
  tipo: z.enum(["TRANSFERENCIA", "AJUSTE"]),
  cuentaOrigen: z.string(),
  cuentaDestino: z.string(),
  importe: z.coerce.number().positive("Tiene que ser mayor a 0"),
  fecha: z.string().min(1, "Elegi una fecha"),
  descripcion: z.string().min(1, "Ingresa una descripcion"),
});

type MovimientoForm = z.infer<typeof movimientoSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** value = "CAJA:<id>" | "CUENTA_BANCARIA:<id>" | "" (ninguna). */
function parseCuenta(value: string): { tipo: TipoCuentaFondo; id: string } | null {
  if (!value) return null;
  const [tipo, id] = value.split(":");
  if (!tipo || !id) return null;
  return { tipo: tipo as TipoCuentaFondo, id };
}

/**
 * Nota 22, seccion 3-4: TRANSFERENCIA necesita origen Y destino; AJUSTE
 * necesita al menos uno de los dos (ej. un ajuste que solo acredita una
 * caja no tiene "origen"). El backend valida esto tambien — el form lo
 * replica para dar feedback antes de pegarle a la API.
 */
export function NuevoMovimientoFondoDialog() {
  const [open, setOpen] = useState(false);
  const cajasQuery = useCajas();
  const cuentasBancariasQuery = useCuentasBancarias();
  const crearMovimiento = useCrearMovimientoFondo();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<MovimientoForm>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: { tipo: "TRANSFERENCIA", fecha: hoyISO(), cuentaOrigen: NINGUNA, cuentaDestino: NINGUNA },
  });

  const tipo = watch("tipo");

  const onSubmit = (values: MovimientoForm) => {
    const origen = parseCuenta(values.cuentaOrigen);
    const destino = parseCuenta(values.cuentaDestino);

    if (values.tipo === "TRANSFERENCIA" && (!origen || !destino)) {
      setError("cuentaOrigen", { message: "Una transferencia necesita cuenta de origen y de destino" });
      return;
    }
    if (values.tipo === "AJUSTE" && !origen && !destino) {
      setError("cuentaOrigen", { message: "Un ajuste necesita al menos una cuenta (origen o destino)" });
      return;
    }

    crearMovimiento.mutate(
      {
        fecha: values.fecha,
        tipo: values.tipo,
        cuentaOrigenTipo: origen?.tipo ?? null,
        cuentaOrigenId: origen?.id ?? null,
        cuentaDestinoTipo: destino?.tipo ?? null,
        cuentaDestinoId: destino?.id ?? null,
        importe: values.importe,
        descripcion: values.descripcion,
      },
      {
        onSuccess: () => {
          toast.success("Movimiento registrado");
          reset({ tipo: "TRANSFERENCIA", fecha: hoyISO(), cuentaOrigen: NINGUNA, cuentaDestino: NINGUNA });
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el movimiento");
        },
      },
    );
  };

  const opciones = [
    ...(cajasQuery.data?.map((c) => ({ value: `CAJA:${c.id}`, label: `Caja — ${c.nombre}` })) ?? []),
    ...(cuentasBancariasQuery.data?.map((c) => ({ value: `CUENTA_BANCARIA:${c.id}`, label: `Cuenta bancaria — ${c.nombre}` })) ?? []),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset({ tipo: "TRANSFERENCIA", fecha: hoyISO(), cuentaOrigen: NINGUNA, cuentaDestino: NINGUNA });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Nuevo movimiento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento de fondo</DialogTitle>
          <DialogDescription>Nota 22, seccion 3-4. Transferencia entre cuentas propias o ajuste manual.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <Select id="tipo" {...register("tipo")}>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="AJUSTE">Ajuste</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuentaOrigen">Cuenta origen {tipo === "AJUSTE" && "(opcional)"}</Label>
            <Select id="cuentaOrigen" {...register("cuentaOrigen")}>
              <option value={NINGUNA}>Ninguna</option>
              {opciones.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {errors.cuentaOrigen && <p className="text-xs text-red-600">{errors.cuentaOrigen.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuentaDestino">Cuenta destino {tipo === "AJUSTE" && "(opcional)"}</Label>
            <Select id="cuentaDestino" {...register("cuentaDestino")}>
              <option value={NINGUNA}>Ninguna</option>
              {opciones.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="importe">Importe</Label>
            <Input id="importe" type="number" step="0.01" {...register("importe")} />
            {errors.importe && <p className="text-xs text-red-600">{errors.importe.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripcion</Label>
            <Input id="descripcion" placeholder="Transferencia a caja chica" {...register("descripcion")} />
            {errors.descripcion && <p className="text-xs text-red-600">{errors.descripcion.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearMovimiento.isPending}>
              {crearMovimiento.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
