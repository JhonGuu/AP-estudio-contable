import { describe, expect, it, vi } from "vitest";
import { ObtenerLibroMayor } from "./ObtenerLibroMayor.js";
import type { AsientoRepository, MovimientoMayor } from "../infra/AsientoRepository.js";
import type { PlanCuentaRepository } from "../infra/PlanCuentaRepository.js";
import type { CuentaContable } from "../domain/CuentaContable.js";

function buildCuenta(overrides: Partial<CuentaContable> = {}): CuentaContable {
  return {
    id: "cta-caja",
    tenantId: "tenant-1",
    empresaId: "empresa-1",
    codigo: "1.1.01.001",
    nombre: "Caja",
    tipo: "ACTIVO",
    imputable: true,
    ...overrides,
  };
}

function buildMocks(cuenta: CuentaContable | null, movimientos: MovimientoMayor[]) {
  const asientoRepository = {
    listarMovimientosPorCuenta: vi.fn().mockResolvedValue(movimientos),
  } as unknown as AsientoRepository;

  const planCuentaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue(cuenta),
  } as unknown as PlanCuentaRepository;

  return { asientoRepository, planCuentaRepository };
}

describe("ObtenerLibroMayor", () => {
  it("calcula el saldo acumulado linea por linea (DEBE suma, HABER resta) y los totales", async () => {
    const movimientos: MovimientoMayor[] = [
      { asientoId: "a1", asientoNumero: 1, fecha: new Date("2026-01-05"), leyenda: "Venta 1", lado: "DEBE", importe: 1000 },
      { asientoId: "a2", asientoNumero: 2, fecha: new Date("2026-01-10"), leyenda: "Pago", lado: "HABER", importe: 300 },
      { asientoId: "a3", asientoNumero: 3, fecha: new Date("2026-01-15"), leyenda: "Venta 2", lado: "DEBE", importe: 500 },
    ];
    const { asientoRepository, planCuentaRepository } = buildMocks(buildCuenta(), movimientos);
    const useCase = new ObtenerLibroMayor(asientoRepository, planCuentaRepository);

    const resultado = await useCase.ejecutar("empresa-1", "cta-caja", {});

    expect(resultado.lineas.map((l) => l.saldo)).toEqual([1000, 700, 1200]);
    expect(resultado.totalDebe).toBe(1500);
    expect(resultado.totalHaber).toBe(300);
    expect(resultado.saldoFinal).toBe(1200);
    expect(resultado.cuenta.codigo).toBe("1.1.01.001");
  });

  it("devuelve saldo 0 y listas vacias cuando la cuenta no tiene movimientos en el rango", async () => {
    const { asientoRepository, planCuentaRepository } = buildMocks(buildCuenta(), []);
    const useCase = new ObtenerLibroMayor(asientoRepository, planCuentaRepository);

    const resultado = await useCase.ejecutar("empresa-1", "cta-caja", {});

    expect(resultado.lineas).toEqual([]);
    expect(resultado.totalDebe).toBe(0);
    expect(resultado.totalHaber).toBe(0);
    expect(resultado.saldoFinal).toBe(0);
  });

  it("rechaza con 404 si la cuenta no existe o no pertenece a la empresa", async () => {
    const { asientoRepository, planCuentaRepository } = buildMocks(null, []);
    const useCase = new ObtenerLibroMayor(asientoRepository, planCuentaRepository);

    await expect(useCase.ejecutar("empresa-1", "cta-inexistente", {})).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
    expect(asientoRepository.listarMovimientosPorCuenta).not.toHaveBeenCalled();
  });
});
