export const ESTADOS_EMPRESA = ["ACTIVO", "INACTIVO"] as const;
export type EstadoEmpresa = (typeof ESTADOS_EMPRESA)[number];

/**
 * Modulos de negocio activables por empresa (add-ons opcionales — notas 23 y 24):
 * stock y sueldos no son obligatorios para todas las empresas-cliente del estudio.
 */
export const MODULOS_ACTIVABLES = ["STOCK", "SUELDOS"] as const;
export type ModuloActivable = (typeof MODULOS_ACTIVABLES)[number];

export interface Empresa {
  id: string;
  tenantId: string;
  razonSocial: string;
  nombreComercial: string | null;
  cuit: string;
  condicionIvaId: string;
  domicilioFiscal: string;
  provinciaId: string;
  actividadAfip: string;
  monedaBaseId: string;
  cierreEjercicio: string; // "MM-DD"
  estado: EstadoEmpresa;
  modulosActivos: ModuloActivable[];
}
