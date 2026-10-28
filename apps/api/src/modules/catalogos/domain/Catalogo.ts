/**
 * Tipos de los catalogos globales de la app (nota 01, nota 25 seccion 3):
 * sin tenant_id/empresa_id, se cargan una sola vez por ambiente via el seed
 * (pnpm db:seed). El frontend los pide una sola vez (GET /catalogos) para
 * armar los selects de los formularios de alta (proveedor, cliente, empresa,
 * caja/cuenta bancaria).
 */
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
