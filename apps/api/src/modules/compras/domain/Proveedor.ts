/** Proveedor de la empresa-cliente (nota 08, seccion 2 — equivalente a cmp_proveedor). */
export interface Proveedor {
  id: string;
  tenantId: string;
  empresaId: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio: string | null;
  activo: boolean;
}
