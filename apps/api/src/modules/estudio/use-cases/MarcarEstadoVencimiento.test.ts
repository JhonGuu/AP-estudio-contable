import { describe, expect, it, vi } from "vitest";
import { MarcarEstadoVencimiento } from "./MarcarEstadoVencimiento.js";
import type { VencimientoRepository } from "../infra/VencimientoRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import type { VencimientoFiscal } from "../domain/VencimientoFiscal.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-1", tenantId: "tenant-1", rolGlobal: "ADMIN" };

const VENCIMIENTO_BASE: VencimientoFiscal = {
  id: "vencimiento-1",
  tenantId: "tenant-1",
  empresaId: "empresa-1",
  tipo: "IVA",
  descripcion: null,
  periodo: null,
  fechaVencimiento: new Date("2026-11-20"),
  estado: "PENDIENTE",
  fechaCumplido: null,
  asignadoAUsuarioId: null,
  creadoPorUsuarioId: "usuario-1",
  fechaCreacion: new Date("2026-10-01"),
};

function buildMocks(vencimiento: VencimientoFiscal | null = VENCIMIENTO_BASE) {
  const vencimientoRepository = {
    buscarPorIdYTenant: vi.fn().mockResolvedValue(vencimiento),
    actualizarEstado: vi
      .fn()
      .mockImplementation(async (id: string, estado: string, fechaCumplido: Date | null) => ({
        ...VENCIMIENTO_BASE,
        id,
        estado,
        fechaCumplido,
      })),
  } as unknown as VencimientoRepository;

  return { vencimientoRepository };
}

describe("MarcarEstadoVencimiento", () => {
  it("marca un vencimiento pendiente como cumplido, registrando la fecha", async () => {
    const mocks = buildMocks();
    const useCase = new MarcarEstadoVencimiento(mocks.vencimientoRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "vencimiento-1", "CUMPLIDO");

    expect(resultado.estado).toBe("CUMPLIDO");
    expect(resultado.fechaCumplido).toBeInstanceOf(Date);
    expect(mocks.vencimientoRepository.actualizarEstado).toHaveBeenCalledWith(
      "vencimiento-1",
      "CUMPLIDO",
      expect.any(Date),
    );
  });

  it("permite des-marcar un vencimiento cumplido, limpiando la fecha", async () => {
    const mocks = buildMocks({ ...VENCIMIENTO_BASE, estado: "CUMPLIDO", fechaCumplido: new Date("2026-10-15") });
    const useCase = new MarcarEstadoVencimiento(mocks.vencimientoRepository);

    const resultado = await useCase.ejecutar(CONTEXT, "vencimiento-1", "PENDIENTE");

    expect(resultado.estado).toBe("PENDIENTE");
    expect(resultado.fechaCumplido).toBeNull();
    expect(mocks.vencimientoRepository.actualizarEstado).toHaveBeenCalledWith("vencimiento-1", "PENDIENTE", null);
  });

  it("rechaza si el vencimiento no existe en este tenant", async () => {
    const mocks = buildMocks(null);
    const useCase = new MarcarEstadoVencimiento(mocks.vencimientoRepository);

    await expect(useCase.ejecutar(CONTEXT, "vencimiento-ajeno", "CUMPLIDO")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
