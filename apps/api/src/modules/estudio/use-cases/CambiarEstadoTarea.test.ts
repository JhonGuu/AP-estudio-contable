import { describe, expect, it, vi } from "vitest";
import { CambiarEstadoTarea } from "./CambiarEstadoTarea.js";
import type { TareaRepository } from "../infra/TareaRepository.js";
import type { AuthContext } from "../../../shared/http/requestContext.js";
import type { EstadoTarea } from "../domain/TareaEstudio.js";

const CONTEXT: AuthContext = { usuarioId: "usuario-1", tenantId: "tenant-1", rolGlobal: "ADMIN" };

function buildMocks(estadoActual: EstadoTarea) {
  const tareaRepository = {
    buscarPorIdYTenant: vi.fn().mockResolvedValue({ id: "tarea-1", tenantId: "tenant-1", estado: estadoActual }),
    actualizarEstado: vi
      .fn()
      .mockImplementation(async (id, estado, fechaCompletada) => ({ id, estado, fechaCompletada })),
  } as unknown as TareaRepository;

  return { tareaRepository };
}

describe("CambiarEstadoTarea", () => {
  it("pasa de PENDIENTE a EN_PROCESO", async () => {
    const mocks = buildMocks("PENDIENTE");
    const useCase = new CambiarEstadoTarea(mocks.tareaRepository);

    const tarea = await useCase.ejecutar(CONTEXT, "tarea-1", "EN_PROCESO");

    expect(tarea.estado).toBe("EN_PROCESO");
    expect(mocks.tareaRepository.actualizarEstado).toHaveBeenCalledWith("tarea-1", "EN_PROCESO", null);
  });

  it("al completar una tarea, setea fechaCompletada", async () => {
    const mocks = buildMocks("EN_PROCESO");
    const useCase = new CambiarEstadoTarea(mocks.tareaRepository);

    await useCase.ejecutar(CONTEXT, "tarea-1", "COMPLETADA");

    expect(mocks.tareaRepository.actualizarEstado).toHaveBeenCalledWith(
      "tarea-1",
      "COMPLETADA",
      expect.any(Date),
    );
  });

  it("rechaza una transicion invalida (de un estado terminal no se puede salir)", async () => {
    const mocks = buildMocks("COMPLETADA");
    const useCase = new CambiarEstadoTarea(mocks.tareaRepository);

    await expect(useCase.ejecutar(CONTEXT, "tarea-1", "PENDIENTE")).rejects.toMatchObject({
      statusCode: 422,
      code: "TRANSICION_ESTADO_INVALIDA",
    });
    expect(mocks.tareaRepository.actualizarEstado).not.toHaveBeenCalled();
  });

  it("rechaza si la tarea no existe en este tenant", async () => {
    const tareaRepository = {
      buscarPorIdYTenant: vi.fn().mockResolvedValue(null),
      actualizarEstado: vi.fn(),
    } as unknown as TareaRepository;
    const useCase = new CambiarEstadoTarea(tareaRepository);

    await expect(useCase.ejecutar(CONTEXT, "tarea-inexistente", "EN_PROCESO")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
