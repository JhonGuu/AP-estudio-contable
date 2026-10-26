import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

/** nota 22: cada medio imputa a la cuenta "de fabrica" de ese medio — no hace falta elegir una caja/cuenta especifica. */
export type MedioPago = "CAJA" | "CUENTA_BANCARIA" | "CHEQUE_PROPIO" | "CHEQUE_TERCERO" | "TARJETA";

export interface Pago {
  id: string;
  proveedorId: string;
  fecha: string;
  importeTotal: number;
}

export interface NuevoPagoCompraInput {
  proveedorId: string;
  fecha: string;
  importeTotal: number;
  medios: { medio: MedioPago; importe: number }[];
  comprobantes: { comprobanteId: string; importeAplicado: number }[];
}

/**
 * POST /compras/pagos (nota 08, seccion 3). v1 del frontend: un pago contra
 * un solo comprobante y un solo medio por vez (el backend soporta varios de
 * cada uno, pero esa UI queda para mas adelante). Invalida comprobantes-compra
 * para que la tabla refleje el saldoPendiente actualizado sin necesitar una
 * pantalla de "pagos" aparte (todavia no hay GET /compras/pagos).
 */
export function useCrearPagoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoPagoCompraInput) =>
      apiFetch<Pago>("/compras/pagos", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-compra"] });
    },
  });
}
