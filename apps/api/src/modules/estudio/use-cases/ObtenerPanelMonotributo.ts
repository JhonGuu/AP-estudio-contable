import { inject, injectable } from "inversify";
import { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import { CatalogoRepository } from "../../catalogos/infra/CatalogoRepository.js";
import { VentaComprobanteRepository } from "../../ventas/infra/VentaComprobanteRepository.js";
import { calcularEstadoMonotributo, type ItemPanelMonotributo } from "../domain/PanelMonotributo.js";

/**
 * Codigos AFIP de `condicion_iva` que corresponden a monotributo (ver
 * CONDICIONES_IVA en src/db/seed/index.ts: "6" Responsable Monotributo,
 * "13" Monotributista Social). Solo las empresas con una de estas
 * condiciones entran al panel — el resto (RI, exento, etc.) no aplica.
 */
const CODIGOS_AFIP_MONOTRIBUTO = ["6", "13"];

/** GET /estudio/monotributo — siempre a nivel tenant, igual que el resto de `estudio`. */
@injectable()
export class ObtenerPanelMonotributo {
  constructor(
    @inject(EmpresaRepository) private readonly empresaRepository: EmpresaRepository,
    @inject(CatalogoRepository) private readonly catalogoRepository: CatalogoRepository,
    @inject(VentaComprobanteRepository) private readonly ventaComprobanteRepository: VentaComprobanteRepository,
  ) {}

  async ejecutar(tenantId: string): Promise<ItemPanelMonotributo[]> {
    const [empresas, catalogos] = await Promise.all([
      this.empresaRepository.listarPorTenant(tenantId),
      this.catalogoRepository.obtenerTodos(),
    ]);

    const idsCondicionMonotributo = new Set(
      catalogos.condicionesIva.filter((c) => CODIGOS_AFIP_MONOTRIBUTO.includes(c.codigoAfip)).map((c) => c.id),
    );
    const empresasMonotributistas = empresas.filter((e) => idsCondicionMonotributo.has(e.condicionIvaId));

    const topesPorCategoriaId = new Map(catalogos.categoriasMonotributo.map((c) => [c.id, c.topeAnualFacturacion]));

    // Acumulado movil de los ultimos 12 meses (igual a como ARCA evalua la recategorizacion real, no año calendario).
    const hasta = new Date();
    const desde = new Date(hasta);
    desde.setFullYear(desde.getFullYear() - 1);

    return Promise.all(
      empresasMonotributistas.map(async (empresa) => {
        const facturacionAcumulada = await this.ventaComprobanteRepository.sumarImporteConfirmadoPorEmpresa(
          empresa.id,
          desde,
          hasta,
        );
        const topeCategoria = empresa.categoriaMonotributoId
          ? (topesPorCategoriaId.get(empresa.categoriaMonotributoId) ?? null)
          : null;

        return {
          empresaId: empresa.id,
          razonSocial: empresa.razonSocial,
          categoriaMonotributoId: empresa.categoriaMonotributoId,
          facturacionAcumulada,
          topeCategoria,
          porcentajeTope: topeCategoria !== null ? facturacionAcumulada / topeCategoria : null,
          estado: calcularEstadoMonotributo(facturacionAcumulada, topeCategoria),
        };
      }),
    );
  }
}
