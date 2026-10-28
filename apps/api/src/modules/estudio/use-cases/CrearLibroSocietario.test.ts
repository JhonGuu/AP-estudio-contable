import { describe, expect, it, vi } from "vitest";
import { CrearLibroSocietario } from "./CrearLibroSocietario.js";
import type { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-creador", tenantId: "tenant-1", rolGlobal: "ADMIN" };

function buildMocks(opts: { empresa?: unknown } = {}) {
  const libroRepository = {
    crear: vi.fn().mockImplementation(async (input) => ({ id: "libro-1", estado: "EN_USO", ...input })),
  } as unknown as LibroSocietarioRepository;

  const empresaRepository = {
    buscarPorIdYTenant: vi
      .fn()
      .mockResolvedValue(opts.empresa === undefined ? { id: "empresa-1", tenantId: "tenant-1" } : opts.empresa),
  } as unknown as EmpresaRepository;

  return { libroRepository, empresaRepository };
}

describe("CrearLibroSocietario", () => {
  it("crea un libro societario en estado EN_USO, validando que la empresa pertenece al tenant", async () => {
    const mocks = buildMocks();
    const useCase = new CrearLibroSocietario(mocks.libroRepository, mocks.empresaRepository);

    const libro = await useCase.ejecutar(CONTEXT, {
      empresaId: "empresa-1",
      tipo: "ACTAS_DIRECTORIO",
      numero: 3,
    });

    expect(mocks.empresaRepository.buscarPorIdYTenant).toHaveBeenCalledWith("empresa-1", "tenant-1");
    expect(libro.empresaId).toBe("empresa-1");
    expect(libro.numero).toBe(3);
    expect(libro.estado).toBe("EN_USO");
    expect(libro.creadoPorUsuarioId).toBe("usuario-creador");
  });

  it("crea un libro con folios y fecha de rubrica opcionales", async () => {
    const mocks = buildMocks();
    const useCase = new CrearLibroSocietario(mocks.libroRepository, mocks.empresaRepository);

    const libro = await useCase.ejecutar(CONTEXT, {
      empresaId: "empresa-1",
      tipo: "REGISTRO_ACCIONES",
      numero: 1,
      cantidadFolios: 100,
      fechaRubrica: new Date("2026-01-15"),
      ubicacion: "Archivo del estudio",
    });

    expect(libro.cantidadFolios).toBe(100);
    expect(libro.ubicacion).toBe("Archivo del estudio");
  });

  it("rechaza si la empresa no pertenece a este estudio", async () => {
    const mocks = buildMocks({ empresa: null });
    const useCase = new CrearLibroSocietario(mocks.libroRepository, mocks.empresaRepository);

    await expect(
      useCase.ejecutar(CONTEXT, { empresaId: "empresa-ajena", tipo: "DIARIO", numero: 1 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
