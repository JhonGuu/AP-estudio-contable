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
import { useCuentasBancarias, useDepositarCheque, type Cheque } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const depositoSchema = z.object({
  cuentaBancariaId: z.string().uuid("Elegi una cuenta bancaria"),
  fecha: z.string().min(1, "Elegi una fecha"),
});

type DepositoForm = z.infer<typeof depositoSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface DepositarChequeDialogProps {
  cheque: Cheque | null;
  onOpenChange: (open: boolean) => void;
}

/** Controlado desde la tabla de cheques — solo cheques RECIBIDO se pueden depositar (nota 22, seccion 4). */
export function DepositarChequeDialog({ cheque, onOpenChange }: DepositarChequeDialogProps) {
  const cuentasBancariasQuery = useCuentasBancarias();
  const depositarCheque = useDepositarCheque();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepositoForm>({ resolver: zodResolver(depositoSchema), defaultValues: { fecha: hoyISO() } });

  useEffect(() => {
    if (cheque) reset({ fecha: hoyISO(), cuentaBancariaId: "" });
  }, [cheque, reset]);

  if (!cheque) return null;

  const onSubmit = (values: DepositoForm) => {
    depositarCheque.mutate(
      { id: cheque.id, input: values },
      {
        onSuccess: () => {
          toast.success("Cheque depositado");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo depositar el cheque");
        },
      },
    );
  };

  return (
    <Dialog open={!!cheque} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Depositar cheque N° {cheque.numero}</DialogTitle>
          <DialogDescription>$ {Number(cheque.importe).toFixed(2)}.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="cuentaBancariaId">Cuenta bancaria destino</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" {...register("fecha")} />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={depositarCheque.isPending}>
              {depositarCheque.isPending ? "Guardando..." : "Depositar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
