import { describe, expect, it, vi } from "vitest";
import { ObtenerPanelMonotributo } from "./ObtenerPanelMonotributo.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { CatalogoRepository } from "../../catalogos/infra/CatalogoRepository.js";
import type { VentaComprobanteRepository } from "../../ventas/infra/VentaComprobanteRepository.js";

const CATALOGOS = {
  monedas: [],
  provincias: [],
  condicionesIva: [
    { id: "cond-ri", codigoAfip: "1", nombre: "IVA Responsable Inscripto", esResponsableInscripto: true },
    { id: "cond-mono", codigoAfip: "6", nombre: "Responsable Monotributo", esResponsableInscripto: false },
  ],
  tiposDocumento: [],
  categoriasMonotributo: [{ id: "cat-c", codigo: "C", orden: 3, topeAnualFacturacion: 10000, soloVentaBienes: false }],
};

function empresaBase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "empresa-1",
    razonSocial: "Cliente Monotributo SA",
    condicionIvaId: "cond-mono",
    categoriaMonotributoId: "cat-c",
    ...overrides,
  };
}

function buildMocks(empresas: unknown[], facturacionPorEmpresa: Record<string, number> = {}) {
  const empresaRepository = {
    listarPorTenant: vi.fn().mockResolvedValue(empresas),
  } as unknown as EmpresaRepository;

  const catalogoRepository = {
    obtenerTodos: vi.fn().mockResolvedValue(CATALOGOS),
  } as unknown as CatalogoRepository;

  const ventaComprobanteRepository = {
    sumarImporteConfirmadoPorEmpresa: vi.fn().mockImplementation(async (empresaId: string) => facturacionPorEmpresa[empresaId] ?? 0),
  } as unknown as VentaComprobanteRepository;

  return { empresaRepository, catalogoRepository, ventaComprobanteRepository };
}

describe("ObtenerPanelMonotributo", () => {
  it("excluye empresas que no son monotributistas (ej. Responsable Inscripto)", async () => {
    const mocks = buildMocks([empresaBase({ id: "empresa-ri", condicionIvaId: "cond-ri", categoriaMonotributoId: null })]);
    const useCase = new ObtenerPanelMonotributo(mocks.empresaRepository, mocks.catalogoRepository, mocks.ventaComprobanteRepository);

    const panel = await useCase.ejecutar("tenant-1");

    expect(panel).toHaveLength(0);
  });

  it("marca SIN_CATEGORIZAR a un monotributista sin categoria cargada", async () => {
    const mocks = buildMocks([empresaBase({ categoriaMonotributoId: null })], { "empresa-1": 5000 });
    const useCase = new ObtenerPanelMonotributo(mocks.empresaRepository, mocks.catalogoRepository, mocks.ventaComprobanteRepository);

    const [item] = await useCase.ejecutar("tenant-1");

    expect(item?.estado).toBe("SIN_CATEGORIZAR");
    expect(item?.topeCategoria).toBeNull();
  });

  it("calcula el estado segun la facturacion acumulada contra el tope de la categoria", async () => {
    const mocks = buildMocks([empresaBase()], { "empresa-1": 9000 });
    const useCase = new ObtenerPanelMonotributo(mocks.empresaRepository, mocks.catalogoRepository, mocks.ventaComprobanteRepository);

    const [item] = await useCase.ejecutar("tenant-1");

    expect(item?.topeCategoria).toBe(10000);
    expect(item?.porcentajeTope).toBeCloseTo(0.9);
    expect(item?.estado).toBe("ALERTA");
  });

  it("pide la facturacion de los ultimos 12 meses (movil), no el año calendario", async () => {
    const mocks = buildMocks([empresaBase()], { "empresa-1": 1000 });
    const useCase = new ObtenerPanelMonotributo(mocks.empresaRepository, mocks.catalogoRepository, mocks.ventaComprobanteRepository);

    await useCase.ejecutar("tenant-1");

    const [, desde, hasta] = vi.mocked(mocks.ventaComprobanteRepository.sumarImporteConfirmadoPorEmpresa).mock.calls[0]!;
    const diffDias = (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDias).toBeGreaterThan(360);
    expect(diffDias).toBeLessThan(367);
  });
});
