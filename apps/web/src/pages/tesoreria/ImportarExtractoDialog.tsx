import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useImportarExtracto, type LineaExtractoInput } from "@/lib/tesoreria";
import { ApiError } from "@/lib/api-client";

const EJEMPLO = "2026-10-05,Transferencia recibida,15000\n2026-10-06,Pago a proveedor,-8200";

/** Parsea "fecha,descripcion,importe" por linea. Negativo = egreso, positivo = ingreso (convencion homebanking). */
function parsearLineas(texto: string): { lineas: LineaExtractoInput[]; errores: string[] } {
  const lineas: LineaExtractoInput[] = [];
  const errores: string[] = [];
  texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .forEach((linea, idx) => {
      const partes = linea.split(",");
      if (partes.length < 3) {
        errores.push(`Linea ${idx + 1}: formato invalido, esperado "fecha,descripcion,importe"`);
        return;
      }
      const [fecha, ...resto] = partes;
      const importeTexto = resto[resto.length - 1]!.trim();
      const descripcion = resto.slice(0, -1).join(",").trim();
      const importe = Number(importeTexto);
      if (!fecha || Number.isNaN(Date.parse(fecha))) {
        errores.push(`Linea ${idx + 1}: fecha invalida ("${fecha}")`);
        return;
      }
      if (!descripcion || Number.isNaN(importe)) {
        errores.push(`Linea ${idx + 1}: descripcion o importe invalido`);
        return;
      }
      lineas.push({ fecha: fecha.trim(), descripcion, importe });
    });
  return { lineas, errores };
}

/**
 * Nota 22, seccion 5. v1 simplificado: en vez de subir un archivo real del
 * homebanking, se pega el extracto como texto (una linea por movimiento) y
 * se parsea aca mismo — el backend matchea cada linea contra el Libro Mayor
 * de la cuenta.
 */
export function ImportarExtractoDialog({ cuentaBancariaId }: { cuentaBancariaId: string }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const importarExtracto = useImportarExtracto();

  const onSubmit = () => {
    const { lineas, errores: erroresParseo } = parsearLineas(texto);
    if (erroresParseo.length > 0) {
      setErrores(erroresParseo);
      return;
    }
    if (lineas.length === 0) {
      setErrores(["Pega al menos una linea"]);
      return;
    }
    setErrores([]);
    importarExtracto.mutate(
      { cuentaBancariaId, lineas },
      {
        onSuccess: (resultado) => {
          const conciliadas = resultado.filter((l) => l.estado === "CONCILIADA").length;
          toast.success(`Extracto importado: ${conciliadas} de ${resultado.length} linea(s) conciliadas automaticamente`);
          setTexto("");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : "No se pudo importar el extracto");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTexto("");
          setErrores([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Importar extracto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar extracto bancario</DialogTitle>
          <DialogDescription>
            Una linea por movimiento: fecha,descripcion,importe. Positivo = ingreso, negativo = egreso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="extracto">Lineas del extracto</Label>
          <Textarea
            id="extracto"
            placeholder={EJEMPLO}
            rows={8}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {errores.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-red-600">
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={importarExtracto.isPending}>
            {importarExtracto.isPending ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
