import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export type TipoCuenta = "ACTIVO" | "PASIVO" | "PATRIMONIO_NETO" | "RESULTADO";

export interface CuentaContable {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  imputable: boolean;
}

/**
 * GET /contabilidad/plan-cuentas (nota 07, seccion 2). Cierra el hueco que
 * bloqueaba las pantallas de Tesoreria — ahora se puede armar un selector de
 * cuentaContableId/cuentaLiquidadoraId en vez de buscarlo a mano por SQL.
 * `imputable=true` por default porque solo esas cuentas reciben movimientos
 * (las de agrupacion/titulo no aplican como destino de un medio de pago).
 */
export function usePlanCuentas(opts?: { tipo?: TipoCuenta; soloImputables?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.tipo) params.set("tipo", opts.tipo);
  if (opts?.soloImputables ?? true) params.set("imputable", "true");
  const qs = params.toString();

  return useQuery({
    queryKey: ["plan-cuentas", opts?.tipo ?? null, opts?.soloImputables ?? true],
    queryFn: () => apiFetch<CuentaContable[]>(`/contabilidad/plan-cuentas${qs ? `?${qs}` : ""}`, { conEmpresaActiva: true }),
    staleTime: 5 * 60_000,
  });
}
