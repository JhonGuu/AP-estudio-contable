/** Punto de venta / talonario de la empresa (nota 08, seccion 2). */
export interface PuntoVenta {
  id: string;
  tenantId: string;
  empresaId: string;
  numero: number; // numero de punto de venta AFIP
  nombre: string;
  activo: boolean;
}
