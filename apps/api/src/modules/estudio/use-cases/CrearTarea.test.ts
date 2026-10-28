import { describe, expect, it, vi } from "vitest";
import { CrearTarea } from "./CrearTarea.js";
import type { TareaRepository } from "../infra/TareaRepository.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { UsuarioRepository } from "../../identidad/infra/UsuarioRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-creador", tenantId: "tenant-1", rolGlobal: "ADMIN" };

function buildMocks(
  opts: { empresa?: unknown; usuarioAsignado?: { id: string; tenantId: string } | null } = {},
) {
  const tareaRepository = {
    crear: vi.fn().mockImplementation(async (input) => ({ id: "tarea-1", estado: "PENDIENTE", ...input })),
  } as unknown as TareaRepository;

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

  return { tareaRepository, empresaRepository, usuarioRepository };
}

describe("CrearTarea", () => {
  it("crea una tarea interna (sin empresa) asignada a un usuario del mismo tenant", async () => {
    const mocks = buildMocks();
    const useCase = new CrearTarea(mocks.tareaRepository, mocks.empresaRepository, mocks.usuarioRepository);

    const tarea = await useCase.ejecutar(CONTEXT, {
      titulo: "Revisar vencimientos de octubre",
      asignadoAUsuarioId: "usuario-asignado",
    });

    expect(mocks.empresaRepository.buscarPorIdYTenant).not.toHaveBeenCalled();
    expect(tarea.empresaId).toBeNull();
    expect(tarea.creadoPorUsuarioId).toBe("usuario-creador");
    expect(tarea.estado).toBe("PENDIENTE");
  });

  it("crea una tarea asociada a un cliente, validando que la empresa pertenece al tenant", async () => {
    const mocks = buildMocks();
    const useCase = new CrearTarea(mocks.tareaRepository, mocks.empresaRepository, mocks.usuarioRepository);

    const tarea = await useCase.ejecutar(CONTEXT, {
      empresaId: "empresa-1",
      titulo: "DDJJ IVA octubre",
      asignadoAUsuarioId: "usuario-asignado",
    });

    expect(mocks.empresaRepository.buscarPorIdYTenant).toHaveBeenCalledWith("empresa-1", "tenant-1");
    expect(tarea.empresaId).toBe("empresa-1");
  });

  it("rechaza si la empresa indicada no pertenece a este estudio", async () => {
    const mocks = buildMocks({ empresa: null });
    const useCase = new CrearTarea(mocks.tareaRepository, mocks.empresaRepository, mocks.usuarioRepository);

    await expect(
      useCase.ejecutar(CONTEXT, { empresaId: "empresa-ajena", titulo: "x", asignadoAUsuarioId: "usuario-asignado" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rechaza si el usuario asignado no pertenece a este tenant", async () => {
    const mocks = buildMocks({ usuarioAsignado: { id: "usuario-otro-tenant", tenantId: "tenant-2" } });
    const useCase = new CrearTarea(mocks.tareaRepository, mocks.empresaRepository, mocks.usuarioRepository);

    await expect(
      useCase.ejecutar(CONTEXT, { titulo: "x", asignadoAUsuarioId: "usuario-otro-tenant" }),
    ).rejects.toMatchObject({ statusCode: 400, code: "USUARIO_ASIGNADO_INVALIDO" });
  });
});
