import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export type LadoMovimiento = "DEBE" | "HABER";
export type OrigenAsiento = "AUTOMATICO" | "MANUAL";

export interface FiltrosReporte {
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export interface MovimientoAsientoDetalle {
  cuentaId: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  lado: LadoMovimiento;
  importe: number;
}

export interface AsientoConMovimientos {
  id: string;
  numero: number;
  fecha: string;
  leyenda: string;
  origen: OrigenAsiento;
  comprobanteOrigenTipo: string | null;
  comprobanteOrigenId: string | null;
  movimientos: MovimientoAsientoDetalle[];
}

export interface LineaLibroMayor {
  asientoId: string;
  asientoNumero: number;
  fecha: string;
  leyenda: string;
  lado: LadoMovimiento;
  importe: number;
  saldo: number;
}

export interface CuentaContableLibroMayor {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  imputable: boolean;
}

export interface LibroMayorResultado {
  cuenta: CuentaContableLibroMayor;
  lineas: LineaLibroMayor[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

function buildQuery(filtros: FiltrosReporte, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Libro Diario — GET /contabilidad/asientos?desde=&hasta= (nota 11 cnt_asiento). */
export function useAsientos(filtros: FiltrosReporte) {
  return useQuery({
    queryKey: ["asientos", filtros.desde ?? null, filtros.hasta ?? null],
    queryFn: () => apiFetch<AsientoConMovimientos[]>(`/contabilidad/asientos${buildQuery(filtros)}`, { conEmpresaActiva: true }),
  });
}

/**
 * Libro Mayor de una cuenta — GET /contabilidad/libro-mayor?cuentaId=&desde=&hasta=
 * (nota 11 cnt_movimiento filtrado por cuenta). `enabled: !!cuentaId` porque
 * no tiene sentido pedirlo sin haber elegido una cuenta todavia.
 */
export function useLibroMayor(cuentaId: string | null, filtros: FiltrosReporte) {
  return useQuery({
    queryKey: ["libro-mayor", cuentaId, filtros.desde ?? null, filtros.hasta ?? null],
    queryFn: () =>
      apiFetch<LibroMayorResultado>(`/contabilidad/libro-mayor${buildQuery(filtros, { cuentaId: cuentaId! })}`, {
        conEmpresaActiva: true,
      }),
    enabled: !!cuentaId,
  });
}
