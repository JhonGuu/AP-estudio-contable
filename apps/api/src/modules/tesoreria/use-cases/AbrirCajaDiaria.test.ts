import { describe, expect, it, vi } from "vitest";
import { AbrirCajaDiaria } from "./AbrirCajaDiaria.js";
import type { CajaRepository } from "../infra/CajaRepository.js";
import type { CajaDiariaRepository } from "../infra/CajaDiariaRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

const CONTEXT: EmpresaContext = { tenantId: "tenant-1", empresaId: "empresa-1" } as EmpresaContext;

function buildMocks(opts: { cajaDiariaAbierta?: unknown } = {}) {
  const cajaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue({ id: "caja-1", nombre: "Caja principal", saldo: 1000 }),
  } as unknown as CajaRepository;

  const cajaDiariaRepository = {
    buscarAbiertaPorCaja: vi.fn().mockResolvedValue(opts.cajaDiariaAbierta ?? null),
    crear: vi.fn().mockImplementation(async (input) => ({ id: "turno-1", estado: "ABIERTA", ...input })),
  } as unknown as CajaDiariaRepository;

  return { cajaRepository, cajaDiariaRepository };
}

describe("AbrirCajaDiaria", () => {
  it("abre un turno nuevo tomando el saldo actual de la caja", async () => {
    const mocks = buildMocks();
    const useCase = new AbrirCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository);

    const turno = await useCase.ejecutar(CONTEXT, { cajaId: "caja-1", fecha: new Date("2026-10-27") });

    expect(turno.saldoApertura).toBe(1000);
    expect(mocks.cajaDiariaRepository.crear).toHaveBeenCalledWith(
      expect.objectContaining({ cajaId: "caja-1", saldoApertura: 1000 }),
    );
  });

  it("rechaza si la caja ya tiene un turno abierto", async () => {
    const mocks = buildMocks({ cajaDiariaAbierta: { id: "turno-previo" } });
    const useCase = new AbrirCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository);

    await expect(useCase.ejecutar(CONTEXT, { cajaId: "caja-1", fecha: new Date() })).rejects.toMatchObject({
      statusCode: 422,
      code: "CAJA_DIARIA_YA_ABIERTA",
    });
    expect(mocks.cajaDiariaRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza si la caja no existe en la empresa", async () => {
    const mocks = buildMocks();
    (mocks.cajaRepository.buscarPorIdYEmpresa as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new AbrirCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository);

    await expect(useCase.ejecutar(CONTEXT, { cajaId: "caja-x", fecha: new Date() })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
