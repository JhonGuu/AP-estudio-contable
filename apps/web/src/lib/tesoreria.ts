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
