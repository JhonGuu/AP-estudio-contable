import { describe, expect, it, vi } from "vitest";
import { GenerarAsientoDesdeComprobante, type GenerarAsientoInput } from "./GenerarAsientoDesdeComprobante.js";
import type { ModeloAsientoRepository } from "../infra/ModeloAsientoRepository.js";
import type { AsientoRepository } from "../infra/AsientoRepository.js";
import type { EjercicioRepository } from "../infra/EjercicioRepository.js";
import type { ModeloAsiento } from "../domain/ModeloAsiento.js";

/** Mismo modelo PAGO_ASIENTO que siembra el seed (2 lineas simples, DEBE/HABER). */
function buildModeloPago(): ModeloAsiento {
  return {
    id: "modelo-1",
    tenantId: "tenant-1",
    empresaId: "empresa-1",
    evento: "PAGO_ASIENTO",
    nombre: "Pago a proveedores",
    activo: true,
    movimientos: [
      { id: "m1", orden: 1, cuentaId: "cta-proveedores", cuentaCodigo: "2.1.01.001", lado: "DEBE", formula: "PAGO_TOTAL" },
      { id: "m2", orden: 2, cuentaId: "cta-caja", cuentaCodigo: "1.1.01.001", lado: "HABER", formula: "CAJA_TOTAL" },
    ],
  };
}

function buildMocks(modelo: ModeloAsiento | null) {
  const modeloAsientoRepository = {
    buscarPorEvento: vi.fn().mockResolvedValue(modelo),
  } as unknown as ModeloAsientoRepository;

  const asientoRepository = {
    crear: vi.fn().mockImplementation(async (input) => ({ id: "asiento-1", numero: 1, ...input })),
  } as unknown as AsientoRepository;

  const ejercicioRepository = {
    obtenerOCrear: vi.fn().mockResolvedValue({ id: "ejercicio-1" }),
  } as unknown as EjercicioRepository;

  return { modeloAsientoRepository, asientoRepository, ejercicioRepository };
}

function buildInput(overrides: Partial<GenerarAsientoInput> = {}): GenerarAsientoInput {
  return {
    tenantId: "tenant-1",
    empresaId: "empresa-1",
    cierreEjercicioMMDD: "12-31",
    evento: "PAGO_ASIENTO",
    fecha: new Date("2026-01-15"),
    leyenda: "Pago de prueba",
    comprobanteOrigen: { tipo: "pago", id: "pago-1" },
    variables: { PAGO_TOTAL: 1000, CAJA_TOTAL: 1000 },
    ...overrides,
  };
}

describe("GenerarAsientoDesdeComprobante", () => {
  it("genera y persiste el asiento cuando debe == haber", async () => {
    const { modeloAsientoRepository, asientoRepository, ejercicioRepository } = buildMocks(buildModeloPago());
    const useCase = new GenerarAsientoDesdeComprobante(modeloAsientoRepository, asientoRepository, ejercicioRepository);

    const asiento = await useCase.ejecutar(buildInput());

    expect(asientoRepository.crear).toHaveBeenCalledTimes(1);
    const llamada = (asientoRepository.crear as ReturnType<typeof vi.fn>).mock.calls[0];
    if (!llamada) throw new Error("asientoRepository.crear no fue llamado");
    const movimientos = llamada[0].movimientos;
    expect(movimientos).toEqual([
      { cuentaId: "cta-proveedores", cuentaCodigo: "2.1.01.001", lado: "DEBE", importe: 1000 },
      { cuentaId: "cta-caja", cuentaCodigo: "1.1.01.001", lado: "HABER", importe: 1000 },
    ]);
    expect(asiento).toBeTruthy();
  });

  it("rechaza con ASIENTO_DESBALANCEADO sin persistir nada cuando debe != haber", async () => {
    const { modeloAsientoRepository, asientoRepository, ejercicioRepository } = buildMocks(buildModeloPago());
    const useCase = new GenerarAsientoDesdeComprobante(modeloAsientoRepository, asientoRepository, ejercicioRepository);

    // CAJA_TOTAL deliberadamente no cubre todo el PAGO_TOTAL (medio de pago perdido).
    const input = buildInput({ variables: { PAGO_TOTAL: 1000, CAJA_TOTAL: 700 } });

    await expect(useCase.ejecutar(input)).rejects.toMatchObject({
      statusCode: 422,
      code: "ASIENTO_DESBALANCEADO",
    });
    expect(asientoRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza con MODELO_ASIENTO_NO_CONFIGURADO si la empresa no tiene el modelo activo para el evento", async () => {
    const { modeloAsientoRepository, asientoRepository, ejercicioRepository } = buildMocks(null);
    const useCase = new GenerarAsientoDesdeComprobante(modeloAsientoRepository, asientoRepository, ejercicioRepository);

    await expect(useCase.ejecutar(buildInput())).rejects.toMatchObject({
      statusCode: 422,
      code: "MODELO_ASIENTO_NO_CONFIGURADO",
    });
    expect(asientoRepository.crear).not.toHaveBeenCalled();
  });

  it("rechaza con FORMULA_ASIENTO_INVALIDA si una variable de la formula no esta definida", async () => {
    const { modeloAsientoRepository, asientoRepository, ejercicioRepository } = buildMocks(buildModeloPago());
    const useCase = new GenerarAsientoDesdeComprobante(modeloAsientoRepository, asientoRepository, ejercicioRepository);

    // Falta CAJA_TOTAL en las variables (medio de pago no mapeado a ninguna variable).
    const input = buildInput({ variables: { PAGO_TOTAL: 1000 } });

    await expect(useCase.ejecutar(input)).rejects.toMatchObject({ code: "FORMULA_ASIENTO_INVALIDA" });
    expect(asientoRepository.crear).not.toHaveBeenCalled();
  });
});
