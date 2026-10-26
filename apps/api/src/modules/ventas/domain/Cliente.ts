export interface Cliente {
  id: string;
  tenantId: string;
  empresaId: string;
  razonSocial: string;
  cuit: string;
  condicionIvaId: string;
  domicilio: string | null;
  activo: boolean;
}
