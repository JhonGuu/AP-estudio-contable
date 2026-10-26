import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCrearPagoCompra, type MedioPago } from "@/lib/pagos-compra";
import type { ComprobanteCompra } from "@/lib/compras-comprobantes";
import { ApiError } from "@/lib/api-client";

const MEDIOS: { value: MedioPago; label: string }[] = [
  { value: "CAJA", label: "Caja" },
  { value: "CUENTA_BANCARIA", label: "Cuenta bancaria" },
  { value: "CHEQUE_PROPIO", label: "Cheque propio" },
  { value: "CHEQUE_TERCERO", label: "Cheque de tercero" },
  { value: "TARJETA", label: "Tarjeta corporativa" },
];

const pagoSchema = z.object({
  fecha: z.string().min(1, "Elegi una fecha"),
  medio: z.enum(["CAJA", "CUENTA_BANCARIA", "CHEQUE_PROPIO", "CHEQUE_TERCERO", "TARJETA"]),
  importe: z.coerce.number().positive("Tiene que ser mayor a 0"),
});

type PagoForm = z.infer<typeof pagoSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface RegistrarPagoDialogProps {
  comprobante: ComprobanteCompra | null;
  proveedorNombre: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog controlado desde ComprobantesCompraPage (no tiene DialogTrigger
 * propio porque cada fila de la tabla dispara el suyo con un comprobante
 * distinto). v1: un comprobante y un medio de pago por vez.
 */
export function RegistrarPagoDialog({ comprobante, proveedorNombre, onOpenChange }: RegistrarPagoDialogProps) {
  const crearPago = useCrearPagoCompra();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema),
    defaultValues: { fecha: hoyISO(), medio: "CAJA", importe: 0 },
  });

  useEffect(() => {
    if (comprobante) {
      reset({ fecha: hoyISO(), medio: "CAJA", importe: Number(comprobante.saldoPendiente) });
    }
  }, [comprobante, reset]);

  if (!comprobante) return null;

  const onSubmit = (values: PagoForm) => {
    crearPago.mutate(
      {
        proveedorId: comprobante.proveedorId,
        fecha: values.fecha,
        importeTotal: values.importe,
        medios: [{ medio: values.medio, importe: values.importe }],
        comprobantes: [{ comprobanteId: comprobante.id, importeAplicado: values.importe }],
      },
      {
        onSuccess: () => {
          toast.success("Pago registrado");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el pago");
        },
      },
    );
  };

  return (
    <Dialog open={!!comprobante} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago — comprobante #{comprobante.numero}</DialogTitle>
          <DialogDescription>
            {proveedorNombre}. Saldo pendiente: $ {Number(comprobante.saldoPendiente).toFixed(2)}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medio">Medio de pago</Label>
            <Select id="medio" {...register("medio")}>
              {MEDIOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="importe">Importe</Label>
            <Input id="importe" type="number" step="0.01" {...register("importe")} />
            {errors.importe && <p className="text-xs text-red-600">{errors.importe.message}</p>}
            <button
              type="button"
              className="text-xs text-slate-500 underline"
              onClick={() => setValue("importe", Number(comprobante.saldoPendiente))}
            >
              Usar el saldo pendiente completo
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearPago.isPending}>
              {crearPago.isPending ? "Guardando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
