import { describe, expect, it, vi } from "vitest";
import { CerrarCajaDiaria } from "./CerrarCajaDiaria.js";
import type { CajaRepository } from "../infra/CajaRepository.js";
import type { CajaDiariaRepository } from "../infra/CajaDiariaRepository.js";
import type { RegistrarMovimientoFondo } from "./RegistrarMovimientoFondo.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

const CONTEXT: EmpresaContext = { tenantId: "tenant-1", empresaId: "empresa-1" } as EmpresaContext;

function buildMocks(opts: { saldoCaja?: number; estadoTurno?: string } = {}) {
  const cajaRepository = {
    buscarPorIdYEmpresa: vi
      .fn()
      .mockResolvedValue({ id: "caja-1", nombre: "Caja principal", saldo: opts.saldoCaja ?? 1000 }),
  } as unknown as CajaRepository;

  const cajaDiariaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue({
      id: "turno-1",
      cajaId: "caja-1",
      estado: opts.estadoTurno ?? "ABIERTA",
    }),
    cerrar: vi.fn().mockImplementation(async (id, input) => ({ id, estado: "CERRADA", ...input })),
  } as unknown as CajaDiariaRepository;

  const registrarMovimientoFondo = {
    ejecutar: vi.fn().mockResolvedValue({ id: "movimiento-ajuste-1" }),
  } as unknown as RegistrarMovimientoFondo;

  return { cajaRepository, cajaDiariaRepository, registrarMovimientoFondo };
}

describe("CerrarCajaDiaria", () => {
  it("sin diferencia, cierra el turno sin generar ningun ajuste", async () => {
    const mocks = buildMocks({ saldoCaja: 1000 });
    const useCase = new CerrarCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository, mocks.registrarMovimientoFondo);

    const turno = await useCase.ejecutar(CONTEXT, { cajaDiariaId: "turno-1", fecha: new Date(), totalContado: 1000 });

    expect(mocks.registrarMovimientoFondo.ejecutar).not.toHaveBeenCalled();
    expect(turno.diferencia).toBe(0);
    expect(turno.movimientoFondoId).toBeNull();
  });

  it("si sobra plata (contado > teorico), genera un AJUSTE que acredita la caja por el sobrante", async () => {
    const mocks = buildMocks({ saldoCaja: 1000 });
    const useCase = new CerrarCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository, mocks.registrarMovimientoFondo);

    const turno = await useCase.ejecutar(CONTEXT, { cajaDiariaId: "turno-1", fecha: new Date(), totalContado: 1050 });

    expect(mocks.registrarMovimientoFondo.ejecutar).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({
        tipo: "AJUSTE",
        cuentaOrigenTipo: null,
        cuentaDestinoTipo: "CAJA",
        cuentaDestinoId: "caja-1",
        importe: 50,
      }),
    );
    expect(turno.diferencia).toBe(50);
    expect(turno.movimientoFondoId).toBe("movimiento-ajuste-1");
  });

  it("si falta plata (contado < teorico), genera un AJUSTE que debita la caja por el faltante", async () => {
    const mocks = buildMocks({ saldoCaja: 1000 });
    const useCase = new CerrarCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository, mocks.registrarMovimientoFondo);

    const turno = await useCase.ejecutar(CONTEXT, { cajaDiariaId: "turno-1", fecha: new Date(), totalContado: 970 });

    expect(mocks.registrarMovimientoFondo.ejecutar).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({
        tipo: "AJUSTE",
        cuentaOrigenTipo: "CAJA",
        cuentaOrigenId: "caja-1",
        cuentaDestinoTipo: null,
        importe: 30,
      }),
    );
    expect(turno.diferencia).toBe(-30);
  });

  it("rechaza si el turno ya esta cerrado", async () => {
    const mocks = buildMocks({ estadoTurno: "CERRADA" });
    const useCase = new CerrarCajaDiaria(mocks.cajaRepository, mocks.cajaDiariaRepository, mocks.registrarMovimientoFondo);

    await expect(
      useCase.ejecutar(CONTEXT, { cajaDiariaId: "turno-1", fecha: new Date(), totalContado: 1000 }),
    ).rejects.toMatchObject({ statusCode: 422, code: "CAJA_DIARIA_YA_CERRADA" });
  });
});
