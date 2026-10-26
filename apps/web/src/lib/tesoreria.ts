import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

/** nota 22, seccion 2. */
export interface Caja {
  id: string;
  nombre: string;
  monedaId: string;
  cuentaContableId: string;
  saldo: number;
  activa: boolean;
}

export interface NuevaCajaInput {
  nombre: string;
  monedaId: string;
  cuentaContableId: string;
}

export interface CuentaBancaria {
  id: string;
  nombre: string;
  cbu: string | null;
  banco: string;
  monedaId: string;
  cuentaContableId: string;
  saldo: number;
  activa: boolean;
}

export interface NuevaCuentaBancariaInput {
  nombre: string;
  cbu?: string | null;
  banco: string;
  monedaId: string;
  cuentaContableId: string;
}

/** `cuentaLiquidadoraId` referencia una CuentaBancaria (no una cuenta del plan de cuentas pese al nombre — ver RegistrarTarjeta.ts). */
export interface Tarjeta {
  id: string;
  nombre: string;
  cuentaLiquidadoraId: string;
  activa: boolean;
}

export interface NuevaTarjetaInput {
  nombre: string;
  cuentaLiquidadoraId: string;
}

/** GET/POST /tesoreria/cajas (nota 22, seccion 6). */
export function useCajas() {
  return useQuery({
    queryKey: ["cajas"],
    queryFn: () => apiFetch<Caja[]>("/tesoreria/cajas", { conEmpresaActiva: true }),
  });
}

export function useCrearCaja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaCajaInput) =>
      apiFetch<Caja>("/tesoreria/cajas", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cajas"] });
    },
  });
}

/** GET/POST /tesoreria/cuentas-bancarias. */
export function useCuentasBancarias() {
  return useQuery({
    queryKey: ["cuentas-bancarias"],
    queryFn: () => apiFetch<CuentaBancaria[]>("/tesoreria/cuentas-bancarias", { conEmpresaActiva: true }),
  });
}

export function useCrearCuentaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaCuentaBancariaInput) =>
      apiFetch<CuentaBancaria>("/tesoreria/cuentas-bancarias", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
    },
  });
}

/** GET/POST /tesoreria/tarjetas. */
export function useTarjetas() {
  return useQuery({
    queryKey: ["tarjetas"],
    queryFn: () => apiFetch<Tarjeta[]>("/tesoreria/tarjetas", { conEmpresaActiva: true }),
  });
}

export function useCrearTarjeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaTarjetaInput) =>
      apiFetch<Tarjeta>("/tesoreria/tarjetas", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tarjetas"] });
    },
  });
}

/** Talonario de cheques propios de una cuenta bancaria (nota 22, seccion 2). */
export interface Chequera {
  id: string;
  cuentaBancariaId: string;
  numeroDesde: number;
  numeroHasta: number;
  proximoNumero: number;
  activa: boolean;
}

export interface NuevaChequeraInput {
  cuentaBancariaId: string;
  numeroDesde: number;
  numeroHasta: number;
}

export type OrigenCheque = "EMITIDO" | "RECIBIDO";
export type EstadoCheque = "EMITIDO" | "RECIBIDO" | "DEPOSITADO" | "COBRADO" | "RECHAZADO" | "VENCIDO" | "CADUCADO" | "ANULADO";
export type TipoTerceroCheque = "PROVEEDOR" | "CLIENTE";

/** nota 22, seccion 2 y 3: EMITIDO->PROVEEDOR (chequeraId obligatorio), RECIBIDO->CLIENTE (numero obligatorio). */
export interface Cheque {
  id: string;
  origen: OrigenCheque;
  chequeraId: string | null;
  numero: string;
  importe: number;
  fechaEmision: string;
  fechaVencimiento: string;
  bancoEmisor: string | null;
  terceroTipo: TipoTerceroCheque;
  terceroId: string;
  cuentaBancariaId: string | null;
  estado: EstadoCheque;
}

export interface NuevoChequeInput {
  origen: OrigenCheque;
  chequeraId?: string;
  numero?: string;
  importe: number;
  fechaEmision: string;
  fechaVencimiento: string;
  bancoEmisor?: string | null;
  terceroTipo: TipoTerceroCheque;
  terceroId: string;
}

export interface DepositarChequeInput {
  cuentaBancariaId: string;
  fecha: string;
}

export type TipoMovimientoFondo = "TRANSFERENCIA" | "AJUSTE";
export type TipoCuentaFondo = "CAJA" | "CUENTA_BANCARIA";

/** nota 22, seccion 3: TRANSFERENCIA necesita origen y destino; AJUSTE necesita al menos uno de los dos. */
export interface MovimientoFondo {
  id: string;
  fecha: string;
  tipo: TipoMovimientoFondo;
  cuentaOrigenTipo: TipoCuentaFondo | null;
  cuentaOrigenId: string | null;
  cuentaDestinoTipo: TipoCuentaFondo | null;
  cuentaDestinoId: string | null;
  importe: number;
  descripcion: string;
}

export interface NuevoMovimientoFondoInput {
  fecha: string;
  tipo: TipoMovimientoFondo;
  cuentaOrigenTipo?: TipoCuentaFondo | null;
  cuentaOrigenId?: string | null;
  cuentaDestinoTipo?: TipoCuentaFondo | null;
  cuentaDestinoId?: string | null;
  importe: number;
  descripcion: string;
}

/** GET/POST /tesoreria/chequeras. */
export function useChequeras() {
  return useQuery({
    queryKey: ["chequeras"],
    queryFn: () => apiFetch<Chequera[]>("/tesoreria/chequeras", { conEmpresaActiva: true }),
  });
}

export function useCrearChequera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevaChequeraInput) =>
      apiFetch<Chequera>("/tesoreria/chequeras", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chequeras"] });
    },
  });
}

/** GET/POST /tesoreria/cheques + acciones depositar/rechazar. */
export function useCheques() {
  return useQuery({
    queryKey: ["cheques"],
    queryFn: () => apiFetch<Cheque[]>("/tesoreria/cheques", { conEmpresaActiva: true }),
  });
}

export function useCrearCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoChequeInput) =>
      apiFetch<Cheque>("/tesoreria/cheques", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cheques"] });
    },
  });
}

export function useDepositarCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepositarChequeInput }) =>
      apiFetch<Cheque>(`/tesoreria/cheques/${id}/depositar`, { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cheques"] });
      void queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
    },
  });
}

export function useRechazarCheque() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Cheque>(`/tesoreria/cheques/${id}/rechazar`, { method: "POST", conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cheques"] });
      void queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
    },
  });
}

/** GET/POST /tesoreria/movimientos-fondo. */
export function useMovimientosFondo() {
  return useQuery({
    queryKey: ["movimientos-fondo"],
    queryFn: () => apiFetch<MovimientoFondo[]>("/tesoreria/movimientos-fondo", { conEmpresaActiva: true }),
  });
}

export function useCrearMovimientoFondo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NuevoMovimientoFondoInput) =>
      apiFetch<MovimientoFondo>("/tesoreria/movimientos-fondo", { method: "POST", body: input, conEmpresaActiva: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["movimientos-fondo"] });
      void queryClient.invalidateQueries({ queryKey: ["cajas"] });
      void queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
    },
  });
}
