import { describe, expect, it, vi } from "vitest";
import { CrearVencimiento } from "./CrearVencimiento.js";
import type { VencimientoRepository } from "../infra/VencimientoRepository.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { UsuarioRepository } from "../../identidad/infra/UsuarioRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-creador", tenantId: "tenant-1", rolGlobal: "ADMIN" };

function buildMocks(
  opts: { empresa?: unknown; usuarioAsignado?: { id: string; tenantId: string } | null } = {},
) {
  const vencimientoRepository = {
    crear: vi.fn().mockImplementation(async (input) => ({ id: "vencimiento-1", estado: "PENDIENTE", ...input })),
  } as unknown as VencimientoRepository;

  const empresaRepository = {
    buscarPorIdYTenant: vi
      .fn()
      .mockResolvedValue(
        opts.empresa === undefined ? { id: "empresa-1", tenantId: "tenant-1" } : opts.empresa,
      ),
  } as unknown as EmpresaRepository;

  const usuarioRepository = {
    buscarPorId: vi
      .fn()
      .mockResolvedValue(
        opts.usuarioAsignado === undefined
          ? { id: "usuario-asignado", tenantId: "tenant-1" }
          : opts.usuarioAsignado,
      ),
  } as unknown as UsuarioRepository;

  return { vencimientoRepository, empresaRepository, usuarioRepository };
}

describe("CrearVencimiento", () => {
  it("crea un vencimiento sin asignar, validando que la empresa pertenece al tenant", async () => {
    const mocks = buildMocks();
    const useCase = new CrearVencimiento(mocks.vencimientoRepository, mocks.empresaRepository, mocks.usuarioRepository);

    const vencimiento = await useCase.ejecutar(CONTEXT, {
      empresaId: "empresa-1",
      tipo: "IVA",
      fechaVencimiento: new Date("2026-11-20"),
    });

    expect(mocks.empresaRepository.buscarPorIdYTenant).toHaveBeenCalledWith("empresa-1", "tenant-1");
    expect(mocks.usuarioRepository.buscarPorId).not.toHaveBeenCalled();
    expect(vencimiento.empresaId).toBe("empresa-1");
    expect(vencimiento.asignadoAUsuarioId).toBeNull();
    expect(vencimiento.creadoPorUsuarioId).toBe("usuario-creador");
  });

  it("crea un vencimiento asignado a un usuario del mismo tenant", async () => {
    const mocks = buildMocks();
    const useCase = new CrearVencimiento(mocks.vencimientoRepository, mocks.empresaRepository, mocks.usuarioRepository);

    const vencimiento = await useCase.ejecutar(CONTEXT, {
      empresaId: "empresa-1",
      tipo: "MONOTRIBUTO",
      fechaVencimiento: new Date("2026-11-20"),
      asignadoAUsuarioId: "usuario-asignado",
    });

    expect(vencimiento.asignadoAUsuarioId).toBe("usuario-asignado");
  });

  it("rechaza si la empresa no pertenece a este estudio", async () => {
    const mocks = buildMocks({ empresa: null });
    const useCase = new CrearVencimiento(mocks.vencimientoRepository, mocks.empresaRepository, mocks.usuarioRepository);

    await expect(
      useCase.ejecutar(CONTEXT, { empresaId: "empresa-ajena", tipo: "IVA", fechaVencimiento: new Date() }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rechaza si el usuario asignado no pertenece a este tenant", async () => {
    const mocks = buildMocks({ usuarioAsignado: { id: "usuario-otro-tenant", tenantId: "tenant-2" } });
    const useCase = new CrearVencimiento(mocks.vencimientoRepository, mocks.empresaRepository, mocks.usuarioRepository);

    await expect(
      useCase.ejecutar(CONTEXT, {
        empresaId: "empresa-1",
        tipo: "IVA",
        fechaVencimiento: new Date(),
        asignadoAUsuarioId: "usuario-otro-tenant",
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: "USUARIO_ASIGNADO_INVALIDO" });
  });
});
