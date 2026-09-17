export const ESTADOS_TENANT = ["ACTIVO", "SUSPENDIDO", "CANCELADO"] as const;
export type EstadoTenant = (typeof ESTADOS_TENANT)[number];

export const PLANES_TENANT = ["TRIAL", "BASICO", "PROFESIONAL"] as const;
export type PlanTenant = (typeof PLANES_TENANT)[number];

export interface Tenant {
  id: string;
  razonSocial: string;
  cuit: string;
  emailContacto: string;
  plan: PlanTenant;
  estado: EstadoTenant;
  fechaAlta: Date;
  fechaBaja: Date | null;
}
