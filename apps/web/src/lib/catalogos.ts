import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface Moneda {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
}

export interface Provincia {
  id: string;
  codigoAfip: string;
  nombre: string;
}

export interface CondicionIva {
  id: string;
  codigoAfip: string;
  nombre: string;
  esResponsableInscripto: boolean;
}

export interface TipoDocumento {
  id: string;
  codigoAfip: string;
  nombre: string;
  longitud: number | null;
}

export interface CategoriaMonotributo {
  id: string;
  codigo: string;
  orden: number;
  topeAnualFacturacion: number;
  soloVentaBienes: boolean;
}

export interface Catalogos {
  monedas: Moneda[];
  provincias: Provincia[];
  condicionesIva: CondicionIva[];
  tiposDocumento: TipoDocumento[];
  categoriasMonotributo: CategoriaMonotributo[];
}

/**
 * GET /catalogos — catalogos globales (moneda, provincia, condicion IVA,
 * tipo de documento). No cambian durante la sesion, por eso staleTime largo:
 * evita repetir el fetch en cada formulario que los necesita.
 */
export function useCatalogos() {
  return useQuery({
    queryKey: ["catalogos"],
    queryFn: () => apiFetch<Catalogos>("/catalogos"),
    staleTime: 10 * 60_000,
  });
}
