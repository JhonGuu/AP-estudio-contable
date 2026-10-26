import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

/** nota 08 (espejo de pagos-compra): cada medio imputa a la cuenta "de fabrica" de ese medio. Sin retenciones — exclusivas de compras. */
export type MedioCobro = "CAJA" | "CUENTA_BANCARIA" | "TARJETA" | "CHEQUE_PROPIO" | "CHEQUE_TERCERO";

export interface Cobro {
  id: string;
  clienteId: string;
  fecha: string;
  importeTotal: number;
}

export interface NuevoCobroInput {
  clienteId: string;
  fecha: string;
  importeTotal: number;
  medios: { medio: MedioCobro; importe: number }[];
  comprobantes: { comprobanteId: string; importeAplicado: number }[];
}

/**
 * POST /ventas/cobros (nota 08, seccion 3). v1 del frontend: un cobro contra
 * un solo comprobante y un solo medio por vez, igual que RegistrarPagoDialog.
 * Invalida comprobantes-venta para que la tabla refleje el saldoPendiente
 * actualizado (todavia no hay GET /ventas/cobros).
 */
export function useCrearCobroVenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoCobroInput) =>
      apiFetch<Cobro>("/ventas/cobros", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comprobantes-venta"] });
    },
  });
}
