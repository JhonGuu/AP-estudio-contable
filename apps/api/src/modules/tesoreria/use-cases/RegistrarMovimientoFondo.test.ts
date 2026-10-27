import { describe, expect, it, vi } from "vitest";
import { RegistrarMovimientoFondo, type RegistrarMovimientoFondoInput } from "./RegistrarMovimientoFondo.js";
import type { MovimientoFondoRepository } from "../infra/MovimientoFondoRepository.js";
import type { CajaRepository } from "../infra/CajaRepository.js";
import type { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { EmpresaRepository } from "../../identidad/infra/EmpresaRepository.js";
import type { EjercicioRepository } from "../../contabilidad/infra/EjercicioRepository.js";
import type { AsientoRepository } from "../../contabilidad/infra/AsientoRepository.js";
import type { PlanCuentaRepository } from "../../contabilidad/infra/PlanCuentaRepository.js";
import type { CuentaContable } from "../../contabilidad/domain/CuentaContable.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

const CONTEXT: EmpresaContext = { tenantId: "tenant-1", empresaId: "empresa-1" } as EmpresaContext;

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

function buildMocks(opts: { cuentaDiferencias?: CuentaContable | null } = {}) {
  const movimientoFondoRepository = {
    crear: vi.fn().mockImplementation(async (input) => ({ id: "mov-1", ...input })),
  } as unknown as MovimientoFondoRepository;

  const cajaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue({ cuentaContableId: "cta-caja" }),
    ajustarSaldo: vi.fn().mockResolvedValue(undefined),
  } as unknown as CajaRepository;

  const cuentaBancariaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue({ cuentaContableId: "cta-banco" }),
    ajustarSaldo: vi.fn().mockResolvedValue(undefined),
  } as unknown as CuentaBancariaRepository;

  const empresaRepository = {
    buscarPorIdYTenant: vi.fn().mockResolvedValue({ cierreEjercicio: "12-31" }),
  } as unknown as EmpresaRepository;

  const ejercicioRepository = {
    obtenerOCrear: vi.fn().mockResolvedValue({ id: "ejercicio-1" }),
  } as unknown as EjercicioRepository;

  const asientoRepository = {
    crear: vi.fn().mockResolvedValue({ id: "asiento-1" }),
  } as unknown as AsientoRepository;

  const cuentaDiferencias =
    opts.cuentaDiferencias !== undefined
      ? opts.cuentaDiferencias
      : buildCuenta({ id: "cta-diferencias", codigo: "5.9.01.001", nombre: "Diferencias de caja y valores", tipo: "RESULTADO" });

  const planCuentaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockImplementation(async (id: string) => {
      if (id === "cta-caja") return buildCuenta({ id: "cta-caja", codigo: "1.1.01.001", nombre: "Caja" });
      if (id === "cta-banco") return buildCuenta({ id: "cta-banco", codigo: "1.1.01.002", nombre: "Cuentas bancarias" });
      return null;
    }),
    buscarPorCodigo: vi.fn().mockResolvedValue(cuentaDiferencias),
  } as unknown as PlanCuentaRepository;

  return {
    movimientoFondoRepository,
    cajaRepository,
    cuentaBancariaRepository,
    empresaRepository,
    ejercicioRepository,
    asientoRepository,
    planCuentaRepository,
  };
}

function buildUseCase(mocks: ReturnType<typeof buildMocks>) {
  return new RegistrarMovimientoFondo(
    mocks.movimientoFondoRepository,
    mocks.cajaRepository,
    mocks.cuentaBancariaRepository,
    mocks.empresaRepository,
    mocks.ejercicioRepository,
    mocks.asientoRepository,
    mocks.planCuentaRepository,
  );
}

function buildInput(overrides: Partial<RegistrarMovimientoFondoInput> = {}): RegistrarMovimientoFondoInput {
  return {
    tipo: "AJUSTE",
    fecha: new Date("2026-01-15"),
    cuentaOrigenTipo: null,
    cuentaOrigenId: null,
    cuentaDestinoTipo: "CAJA",
    cuentaDestinoId: "caja-1",
    importe: 1500,
    descripcion: "Ajuste por arqueo",
    ...overrides,
  };
}

describe("RegistrarMovimientoFondo", () => {
  it("una TRANSFERENCIA (ambos lados) no agrega contrapartida y queda balanceada", async () => {
    const mocks = buildMocks();
    const useCase = buildUseCase(mocks);

    await useCase.ejecutar(
      CONTEXT,
      buildInput({
        tipo: "TRANSFERENCIA",
        cuentaOrigenTipo: "CAJA",
        cuentaOrigenId: "caja-1",
        cuentaDestinoTipo: "CUENTA_BANCARIA",
        cuentaDestinoId: "cuenta-1",
      }),
    );

    const llamada = (mocks.asientoRepository.crear as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(llamada[0].movimientos).toEqual([
      { cuentaId: "cta-banco", cuentaCodigo: "1.1.01.002", lado: "DEBE", importe: 1500 },
      { cuentaId: "cta-caja", cuentaCodigo: "1.1.01.001", lado: "HABER", importe: 1500 },
    ]);
    expect(mocks.planCuentaRepository.buscarPorCodigo).not.toHaveBeenCalled();
  });

  it("un AJUSTE de un solo lado (solo destino) agrega la contrapartida en HABER y queda balanceado", async () => {
    const mocks = buildMocks();
    const useCase = buildUseCase(mocks);

    await useCase.ejecutar(CONTEXT, buildInput());

    const llamada = (mocks.asientoRepository.crear as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(llamada[0].movimientos).toEqual([
      { cuentaId: "cta-caja", cuentaCodigo: "1.1.01.001", lado: "DEBE", importe: 1500 },
      { cuentaId: "cta-diferencias", cuentaCodigo: "5.9.01.001", lado: "HABER", importe: 1500 },
    ]);
  });

  it("un AJUSTE de un solo lado (solo origen) agrega la contrapartida en DEBE", async () => {
    const mocks = buildMocks();
    const useCase = buildUseCase(mocks);

    await useCase.ejecutar(
      CONTEXT,
      buildInput({ cuentaDestinoTipo: null, cuentaDestinoId: null, cuentaOrigenTipo: "CAJA", cuentaOrigenId: "caja-1" }),
    );

    const llamada = (mocks.asientoRepository.crear as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(llamada[0].movimientos).toEqual([
      { cuentaId: "cta-caja", cuentaCodigo: "1.1.01.001", lado: "HABER", importe: 1500 },
      { cuentaId: "cta-diferencias", cuentaCodigo: "5.9.01.001", lado: "DEBE", importe: 1500 },
    ]);
  });

  it("rechaza con CUENTA_DIFERENCIAS_NO_CONFIGURADA si la empresa no tiene la cuenta de fabrica (no persiste nada)", async () => {
    const mocks = buildMocks({ cuentaDiferencias: null });
    const useCase = buildUseCase(mocks);

    await expect(useCase.ejecutar(CONTEXT, buildInput())).rejects.toMatchObject({
      statusCode: 422,
      code: "CUENTA_DIFERENCIAS_NO_CONFIGURADA",
    });
    expect(mocks.asientoRepository.crear).not.toHaveBeenCalled();
    expect(mocks.movimientoFondoRepository.crear).not.toHaveBeenCalled();
  });
});
