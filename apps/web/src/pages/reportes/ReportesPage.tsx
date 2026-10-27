import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { usePlanCuentas } from "@/lib/plan-cuentas";
import { useAsientos, useLibroMayor, type OrigenAsiento } from "@/lib/reportes";
import { formatFechaISO } from "@/lib/fecha";

const ORIGEN_ASIENTO_VARIANT: Record<OrigenAsiento, "default" | "success"> = {
  AUTOMATICO: "default",
  MANUAL: "success",
};

function formatImporte(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Nota 11 (cnt_asiento/cnt_movimiento): Libro Diario (todos los asientos en
 * orden cronologico, con sus movimientos) y Libro Mayor (movimientos de una
 * cuenta, con saldo acumulado). Mismo rango de fechas para los dos reportes
 * — es el filtro mas comun al revisar un periodo.
 */
export function ReportesPage() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cuentaId, setCuentaId] = useState("");

  const filtros = { desde: desde || undefined, hasta: hasta || undefined };
  const asientosQuery = useAsientos(filtros);
  const planCuentasQuery = usePlanCuentas();
  const libroMayorQuery = useLibroMayor(cuentaId || null, filtros);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Reportes contables</h1>
        <p className="text-sm text-slate-500">Nota 11. Libro Diario y Libro Mayor, a partir de los asientos ya generados.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Periodo</CardTitle>
          <CardDescription>Se aplica a los dos reportes de abajo. Vacio = sin limite.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Libro Diario</CardTitle>
          <CardDescription>Todos los asientos del periodo, en orden cronologico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {asientosQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {asientosQuery.isSuccess && asientosQuery.data.length === 0 && (
            <p className="text-sm text-slate-500">No hay asientos en el periodo elegido.</p>
          )}
          {asientosQuery.data?.map((a) => (
            <div key={a.id} className="rounded-md border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div>
                  <span className="font-mono text-sm font-medium">N° {a.numero}</span>
                  <span className="ml-3 text-sm text-slate-600">{a.leyenda}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ORIGEN_ASIENTO_VARIANT[a.origen]}>{a.origen}</Badge>
                  <span className="text-xs text-slate-500">{formatFechaISO(a.fecha)}</span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.movimientos.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-500">{m.cuentaCodigo}</span> {m.cuentaNombre}
                      </TableCell>
                      <TableCell className="text-right font-mono">{m.lado === "DEBE" ? formatImporte(m.importe) : ""}</TableCell>
                      <TableCell className="text-right font-mono">{m.lado === "HABER" ? formatImporte(m.importe) : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Libro Mayor</CardTitle>
          <CardDescription>Movimientos de una cuenta, con saldo acumulado (Debe - Haber).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-1.5">
            <Label htmlFor="cuentaMayor">Cuenta</Label>
            <Select id="cuentaMayor" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              <option value="">Elegi una cuenta</option>
              {planCuentasQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          {!cuentaId && <p className="text-sm text-slate-500">Elegi una cuenta para ver su mayor.</p>}
          {cuentaId && libroMayorQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
          {cuentaId && libroMayorQuery.isSuccess && libroMayorQuery.data.lineas.length === 0 && (
            <p className="text-sm text-slate-500">Esta cuenta no tiene movimientos en el periodo elegido.</p>
          )}
          {cuentaId && libroMayorQuery.isSuccess && libroMayorQuery.data.lineas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asiento</TableHead>
                  <TableHead>Leyenda</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {libroMayorQuery.data.lineas.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatFechaISO(l.fecha)}</TableCell>
                    <TableCell className="font-mono text-xs">N° {l.asientoNumero}</TableCell>
                    <TableCell>{l.leyenda}</TableCell>
                    <TableCell className="text-right font-mono">{l.lado === "DEBE" ? formatImporte(l.importe) : ""}</TableCell>
                    <TableCell className="text-right font-mono">{l.lado === "HABER" ? formatImporte(l.importe) : ""}</TableCell>
                    <TableCell className="text-right font-mono">{formatImporte(l.saldo)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell colSpan={3}>Totales</TableCell>
                  <TableCell className="text-right font-mono">{formatImporte(libroMayorQuery.data.totalDebe)}</TableCell>
                  <TableCell className="text-right font-mono">{formatImporte(libroMayorQuery.data.totalHaber)}</TableCell>
                  <TableCell className="text-right font-mono">{formatImporte(libroMayorQuery.data.saldoFinal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
