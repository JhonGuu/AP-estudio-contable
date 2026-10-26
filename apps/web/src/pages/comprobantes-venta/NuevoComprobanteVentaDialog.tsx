import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { useClientes } from "@/lib/clientes";
import { useTiposComprobante, usePuntosVenta, type PuntoVenta } from "@/lib/comprobantes-catalogo";
import { useCrearComprobanteVenta, type ComprobanteVentaImpuestoInput } from "@/lib/ventas-comprobantes";
import { ApiError } from "@/lib/api-client";

const ALICUOTAS_IVA = [0, 10.5, 21, 27];

const itemSchema = z.object({
  descripcion: z.string().min(1, "Ingresa una descripcion"),
  cantidad: z.coerce.number().positive("Tiene que ser mayor a 0"),
  precioUnitario: z.coerce.number().nonnegative("No puede ser negativo"),
  alicuotaIva: z.coerce.number().nonnegative(),
});

const comprobanteSchema = z.object({
  clienteId: z.string().uuid("Elegi un cliente"),
  tipoComprobanteId: z.string().uuid("Elegi un tipo de comprobante"),
  puntoVentaId: z.string().uuid("Elegi un punto de venta"),
  fecha: z.string().min(1, "Elegi una fecha"),
  items: z.array(itemSchema).min(1, "Agrega al menos un item"),
});

type ComprobanteForm = z.infer<typeof comprobanteSchema>;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function nombrePuntoVenta(pv: PuntoVenta) {
  return `${pv.numero.toString().padStart(4, "0")} — ${pv.nombre}`;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

const defaultItems = () => [{ descripcion: "", cantidad: 1, precioUnitario: 0, alicuotaIva: 21 }];

/** Espejo de NuevoComprobanteCompraDialog (nota 08, seccion 5). */
export function NuevoComprobanteVentaDialog() {
  const [open, setOpen] = useState(false);
  const clientesQuery = useClientes();
  const tiposComprobanteQuery = useTiposComprobante("VENTA");
  const puntosVentaQuery = usePuntosVenta();
  const crearComprobante = useCrearComprobanteVenta();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ComprobanteForm>({
    resolver: zodResolver(comprobanteSchema),
    defaultValues: { fecha: hoyISO(), items: defaultItems() },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  const netoTotal = items.reduce((acc, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    return acc + cantidad * precio;
  }, 0);
  const ivaTotal = items.reduce((acc, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precioUnitario) || 0;
    const alicuota = Number(item.alicuotaIva) || 0;
    return acc + (cantidad * precio * alicuota) / 100;
  }, 0);
  const importeTotal = netoTotal + ivaTotal;

  const onSubmit = (values: ComprobanteForm) => {
    const impuestos: ComprobanteVentaImpuestoInput[] = ivaTotal > 0 ? [{ tipo: "IVA", importe: round2(ivaTotal) }] : [];

    crearComprobante.mutate(
      {
        clienteId: values.clienteId,
        tipoComprobanteId: values.tipoComprobanteId,
        puntoVentaId: values.puntoVentaId,
        fecha: values.fecha,
        netoTotal: round2(netoTotal),
        exentoTotal: 0,
        noGravadoTotal: 0,
        importeTotal: round2(importeTotal),
        items: values.items,
        impuestos,
      },
      {
        onSuccess: () => {
          toast.success("Comprobante cargado como borrador");
          reset({ fecha: hoyISO(), items: defaultItems() });
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo cargar el comprobante");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset({ fecha: hoyISO(), items: defaultItems() });
      }}
    >
      <DialogTrigger asChild>
        <Button>Nuevo comprobante</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo comprobante de venta</DialogTitle>
          <DialogDescription>
            Nota 08, seccion 4 (espejo de compras): queda como BORRADOR. Confirmalo despues desde la tabla para
            generar el asiento.
          </DialogDescription>
        </DialogHeader>

        <form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clienteId">Cliente</Label>
              <Select id="clienteId" defaultValue="" {...register("clienteId")}>
                <option value="" disabled>
                  Elegi una opcion
                </option>
                {clientesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial}
                  </option>
                ))}
              </Select>
              {errors.clienteId && <p className="text-xs text-red-600">{errors.clienteId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
              {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipoComprobanteId">Tipo de comprobante</Label>
              <Select id="tipoComprobanteId" defaultValue="" {...register("tipoComprobanteId")}>
                <option value="" disabled>
                  Elegi una opcion
                </option>
                {tiposComprobanteQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
              {errors.tipoComprobanteId && <p className="text-xs text-red-600">{errors.tipoComprobanteId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="puntoVentaId">Punto de venta</Label>
              <Select id="puntoVentaId" defaultValue="" {...register("puntoVentaId")}>
                <option value="" disabled>
                  Elegi una opcion
                </option>
                {puntosVentaQuery.data?.map((pv) => (
                  <option key={pv.id} value={pv.id}>
                    {nombrePuntoVenta(pv)}
                  </option>
                ))}
              </Select>
              {errors.puntoVentaId && <p className="text-xs text-red-600">{errors.puntoVentaId.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0, alicuotaIva: 21 })}
              >
                Agregar item
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded-md border border-slate-200 p-2">
                  <div className="col-span-5 space-y-1">
                    {index === 0 && <Label className="text-xs">Descripcion</Label>}
                    <Input {...register(`items.${index}.descripcion` as const)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Cantidad</Label>}
                    <Input type="number" step="0.01" {...register(`items.${index}.cantidad` as const)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">Precio unit.</Label>}
                    <Input type="number" step="0.01" {...register(`items.${index}.precioUnitario` as const)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {index === 0 && <Label className="text-xs">IVA %</Label>}
                    <Select {...register(`items.${index}.alicuotaIva` as const)}>
                      {ALICUOTAS_IVA.map((a) => (
                        <option key={a} value={a}>
                          {a}%
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      X
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {errors.items && typeof errors.items.message === "string" && (
              <p className="text-xs text-red-600">{errors.items.message}</p>
            )}
          </div>

          <div className="space-y-1 rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Neto</span>
              <span>$ {netoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IVA</span>
              <span>$ {ivaTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>$ {importeTotal.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearComprobante.isPending}>
              {crearComprobante.isPending ? "Guardando..." : "Guardar borrador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
