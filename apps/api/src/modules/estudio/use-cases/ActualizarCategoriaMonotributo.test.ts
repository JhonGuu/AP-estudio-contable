import { describe, expect, it, vi } from "vitest";
import { ActualizarCategoriaMonotributo } from "./ActualizarCategoriaMonotributo.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { CatalogoRepository } from "../../catalogos/infra/CatalogoRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-1", tenantId: "tenant-1", rolGlobal: "ADMIN" };

const CATALOGOS_BASE = {
  monedas: [],
  provincias: [],
  condicionesIva: [],
  tiposDocumento: [],
  categoriasMonotributo: [{ id: "cat-c", codigo: "C", orden: 3, topeAnualFacturacion: 24670494.31, soloVentaBienes: false }],
};

function buildMocks(opts: { empresa?: unknown } = {}) {
  const empresaRepository = {
    buscarPorIdYTenant: vi
      .fn()
      .mockResolvedValue(opts.empresa === undefined ? { id: "empresa-1", tenantId: "tenant-1" } : opts.empresa),
    actualizarCategoriaMonotributo: vi
      .fn()
      .mockImplementation(async (empresaId: string, categoriaMonotributoId: string | null) => ({
        id: empresaId,
        categoriaMonotributoId,
      })),
  } as unknown as EmpresaRepository;

  const catalogoRepository = {
    obtenerTodos: vi.fn().mockResolvedValue(CATALOGOS_BASE),
  } as unknown as CatalogoRepository;

  return { empresaRepository, catalogoRepository };
}

describe("ActualizarCategoriaMonotributo", () => {
  it("asigna una categoria valida a una empresa del tenant", async () => {
    const mocks = buildMocks();
    const useCase = new ActualizarCategoriaMonotributo(mocks.empresaRepository, mocks.catalogoRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "empresa-1", "cat-c");

    expect(mocks.empresaRepository.actualizarCategoriaMonotributo).toHaveBeenCalledWith("empresa-1", "cat-c");
    expect(resultado.categoriaMonotributoId).toBe("cat-c");
  });

  it("permite des-categorizar pasando null, sin consultar el catalogo", async () => {
    const mocks = buildMocks();
    const useCase = new ActualizarCategoriaMonotributo(mocks.empresaRepository, mocks.catalogoRepository);

    await useCase.ejecutar(CONTEXT, "empresa-1", null);

    expect(mocks.catalogoRepository.obtenerTodos).not.toHaveBeenCalled();
    expect(mocks.empresaRepository.actualizarCategoriaMonotributo).toHaveBeenCalledWith("empresa-1", null);
  });

  it("rechaza una categoria que no existe en el catalogo", async () => {
    const mocks = buildMocks();
    const useCase = new ActualizarCategoriaMonotributo(mocks.empresaRepository, mocks.catalogoRepository);

    await expect(useCase.ejecutar(CONTEXT, "empresa-1", "cat-inexistente")).rejects.toMatchObject({
      statusCode: 400,
      code: "CATEGORIA_MONOTRIBUTO_INVALIDA",
    });
    expect(mocks.empresaRepository.actualizarCategoriaMonotributo).not.toHaveBeenCalled();
  });

  it("rechaza si la empresa no pertenece a este tenant", async () => {
    const mocks = buildMocks({ empresa: null });
    const useCase = new ActualizarCategoriaMonotributo(mocks.empresaRepository, mocks.catalogoRepository);

    await expect(useCase.ejecutar(CONTEXT, "empresa-ajena", "cat-c")).rejects.toMatchObject({ statusCode: 404 });
  });
});
