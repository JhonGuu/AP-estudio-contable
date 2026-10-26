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
import { useProveedores } from "@/lib/proveedores";
import { useClientes } from "@/lib/clientes";
import { useChequeras, useCrearCheque } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const chequeSchema = z
  .object({
    origen: z.enum(["EMITIDO", "RECIBIDO"]),
    chequeraId: z.string().uuid().optional().or(z.literal("")),
    numero: z.string().optional(),
    terceroId: z.string().uuid("Elegi un tercero"),
    importe: z.coerce.number().positive("Tiene que ser mayor a 0"),
    fechaEmision: z.string().min(1, "Elegi una fecha"),
    fechaVencimiento: z.string().min(1, "Elegi una fecha"),
    bancoEmisor: z.string().optional(),
  })
  .refine((v) => v.origen !== "EMITIDO" || !!v.chequeraId, {
    message: "Elegi la chequera de la que sale",
    path: ["chequeraId"],
  })
  .refine((v) => v.origen !== "RECIBIDO" || !!v.numero, {
    message: "Ingresa el numero del cheque recibido",
    path: ["numero"],
  });

type ChequeForm = z.infer<typeof chequeSchema>;

const hoyISO = () => new Date().toISOString().slice(0, 10);

/**
 * Nota 22, seccion 2 y 3: EMITIDO siempre se le paga a un PROVEEDOR (toma el
 * proximo numero de la chequera elegida); RECIBIDO siempre viene de un
 * CLIENTE (trae su propio numero). El backend rechaza cualquier otra
 * combinacion, asi que el form ni la ofrece.
 */
export function NuevoChequeDialog() {
  const [open, setOpen] = useState(false);
  const proveedoresQuery = useProveedores();
  const clientesQuery = useClientes();
  const chequerasQuery = useChequeras();
  const crearCheque = useCrearCheque();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChequeForm>({
    resolver: zodResolver(chequeSchema),
    defaultValues: { origen: "EMITIDO", fechaEmision: hoyISO(), fechaVencimiento: hoyISO() },
  });

  const origen = watch("origen");

  const onSubmit = (values: ChequeForm) => {
    crearCheque.mutate(
      {
        origen: values.origen,
        chequeraId: values.origen === "EMITIDO" ? values.chequeraId : undefined,
        numero: values.origen === "RECIBIDO" ? values.numero : undefined,
        terceroTipo: values.origen === "EMITIDO" ? "PROVEEDOR" : "CLIENTE",
        terceroId: values.terceroId,
        importe: values.importe,
        fechaEmision: values.fechaEmision,
        fechaVencimiento: values.fechaVencimiento,
        bancoEmisor: values.bancoEmisor || null,
      },
      {
        onSuccess: () => {
          toast.success("Cheque registrado");
          reset({ origen: "EMITIDO", fechaEmision: hoyISO(), fechaVencimiento: hoyISO() });
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo registrar el cheque");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset({ origen: "EMITIDO", fechaEmision: hoyISO(), fechaVencimiento: hoyISO() });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Nuevo cheque</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cheque</DialogTitle>
          <DialogDescription>Nota 22, seccion 2-3.</DialogDescription>
        </DialogHeader>

        <form className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="origen">Origen</Label>
            <Select id="origen" {...register("origen")}>
              <option value="EMITIDO">Emitido (le pago a un proveedor)</option>
              <option value="RECIBIDO">Recibido (me paga un cliente)</option>
            </Select>
          </div>

          {origen === "EMITIDO" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="chequeraId">Chequera</Label>
                <Select id="chequeraId" defaultValue="" {...register("chequeraId")}>
                  <option value="" disabled>
                    Elegi una opcion
                  </option>
                  {chequerasQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      Del {c.numeroDesde} al {c.numeroHasta} (proximo: {c.proximoNumero})
                    </option>
                  ))}
                </Select>
                {errors.chequeraId && <p className="text-xs text-red-600">{errors.chequeraId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="terceroId">Proveedor</Label>
                <Select id="terceroId" defaultValue="" {...register("terceroId")}>
                  <option value="" disabled>
                    Elegi una opcion
                  </option>
                  {proveedoresQuery.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razonSocial}
                    </option>
                  ))}
                </Select>
                {errors.terceroId && <p className="text-xs text-red-600">{errors.terceroId.message}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="numero">Numero del cheque</Label>
                <Input id="numero" {...register("numero")} />
                {errors.numero && <p className="text-xs text-red-600">{errors.numero.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="terceroId">Cliente</Label>
                <Select id="terceroId" defaultValue="" {...register("terceroId")}>
                  <option value="" disabled>
                    Elegi una opcion
                  </option>
                  {clientesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial}
                    </option>
                  ))}
                </Select>
                {errors.terceroId && <p className="text-xs text-red-600">{errors.terceroId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bancoEmisor">Banco emisor (opcional)</Label>
                <Input id="bancoEmisor" {...register("bancoEmisor")} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fechaEmision">Fecha de emision</Label>
              <Input id="fechaEmision" type="date" {...register("fechaEmision")} />
              {errors.fechaEmision && <p className="text-xs text-red-600">{errors.fechaEmision.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
              <Input id="fechaVencimiento" type="date" {...register("fechaVencimiento")} />
              {errors.fechaVencimiento && <p className="text-xs text-red-600">{errors.fechaVencimiento.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="importe">Importe</Label>
            <Input id="importe" type="number" step="0.01" {...register("importe")} />
            {errors.importe && <p className="text-xs text-red-600">{errors.importe.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearCheque.isPending}>
              {crearCheque.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
