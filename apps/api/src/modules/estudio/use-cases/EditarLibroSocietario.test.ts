import { describe, expect, it, vi } from "vitest";
import { EditarLibroSocietario } from "./EditarLibroSocietario.js";
import type { LibroSocietarioRepository } from "../infra/LibroSocietarioRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import type { LibroSocietario } from "../domain/LibroSocietario.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-1", tenantId: "tenant-1", rolGlobal: "ADMIN" };

const LIBRO_BASE: LibroSocietario = {
  id: "libro-1",
  tenantId: "tenant-1",
  empresaId: "empresa-1",
  tipo: "ACTAS_ASAMBLEA",
  numero: 2,
  cantidadFolios: 100,
  ultimoFolioUtilizado: null,
  fechaRubrica: new Date("2026-01-15"),
  ubicacion: "Sede social del cliente",
  estado: "EN_USO",
  observaciones: null,
  creadoPorUsuarioId: "usuario-1",
  fechaCreacion: new Date("2026-01-20"),
};

function buildMocks(libro: LibroSocietario | null = LIBRO_BASE) {
  const libroRepository = {
    buscarPorIdYTenant: vi.fn().mockResolvedValue(libro),
    editar: vi.fn().mockImplementation(async (id: string, patch: Partial<LibroSocietario>) => ({
      ...LIBRO_BASE,
      id,
      ...patch,
    })),
  } as unknown as LibroSocietarioRepository;

  return { libroRepository };
}

describe("EditarLibroSocietario", () => {
  it("marca un libro como COMPLETO al llegar al ultimo folio", async () => {
    const mocks = buildMocks();
    const useCase = new EditarLibroSocietario(mocks.libroRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "libro-1", {
      estado: "COMPLETO",
      ultimoFolioUtilizado: 100,
    });

    expect(resultado.estado).toBe("COMPLETO");
    expect(resultado.ultimoFolioUtilizado).toBe(100);
    expect(mocks.libroRepository.editar).toHaveBeenCalledWith("libro-1", {
      estado: "COMPLETO",
      ultimoFolioUtilizado: 100,
    });
  });

  it("permite actualizar solo la ubicacion sin tocar el estado", async () => {
    const mocks = buildMocks();
    const useCase = new EditarLibroSocietario(mocks.libroRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "libro-1", { ubicacion: "Archivo del estudio" });

    expect(resultado.ubicacion).toBe("Archivo del estudio");
    expect(resultado.estado).toBe("EN_USO");
  });

  it("permite volver de EXTRAVIADO a EN_USO sin reglas de transicion", async () => {
    const mocks = buildMocks({ ...LIBRO_BASE, estado: "EXTRAVIADO" });
    const useCase = new EditarLibroSocietario(mocks.libroRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "libro-1", { estado: "EN_USO" });

    expect(resultado.estado).toBe("EN_USO");
  });

  it("rechaza si el libro no existe en este tenant", async () => {
    const mocks = buildMocks(null);
    const useCase = new EditarLibroSocietario(mocks.libroRepository);

    await expect(useCase.ejecutar(CONTEXT, "libro-ajeno", { estado: "COMPLETO" })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
