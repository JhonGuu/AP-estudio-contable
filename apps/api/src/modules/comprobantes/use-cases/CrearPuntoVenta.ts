import { injectable } from "inversify";
import { PuntoVentaRepository } from "../infra/PuntoVentaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";
import type { PuntoVenta } from "../domain/PuntoVenta.js";

export interface CrearPuntoVentaInput {
  numero: number;
  nombre: string;
}

/** POST /puntos-venta (nota 08, seccion 5) — ABM de puntos de venta de la empresa activa. */
@injectable()
export class CrearPuntoVenta {
  constructor(private readonly puntoVentaRepository: PuntoVentaRepository) {}

  async ejecutar(context: EmpresaContext, input: CrearPuntoVentaInput): Promise<PuntoVenta> {
    return this.puntoVentaRepository.crear({
      tenantId: context.tenantId,
      empresaId: context.empresaId,
      numero: input.numero,
      nombre: input.nombre,
    });
  }
}
