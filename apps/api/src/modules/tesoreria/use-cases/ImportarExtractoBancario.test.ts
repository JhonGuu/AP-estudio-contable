import { describe, expect, it, vi } from "vitest";
import { ImportarExtractoBancario } from "./ImportarExtractoBancario.js";
import type { CuentaBancariaRepository } from "../infra/CuentaBancariaRepository.js";
import type { ConciliacionBancariaRepository } from "../infra/ConciliacionBancariaRepository.js";
import type { AsientoRepository, MovimientoMayor } from "../../contabilidad/infra/AsientoRepository.js";
import type { EmpresaContext } from "../../../shared/http/requestContext.js";

const CONTEXT: EmpresaContext = { tenantId: "tenant-1", empresaId: "empresa-1" } as EmpresaContext;

function movimiento(overrides: Partial<MovimientoMayor> = {}): MovimientoMayor {
  return {
    asientoId: "asiento-1",
    asientoNumero: 1,
    fecha: new Date("2026-10-10"),
    leyenda: "Cobro factura",
    lado: "DEBE",
    importe: 500,
    ...overrides,
  };
}

function buildMocks(opts: { movimientos?: MovimientoMayor[]; yaConciliados?: Set<string> } = {}) {
  const cuentaBancariaRepository = {
    buscarPorIdYEmpresa: vi.fn().mockResolvedValue({ id: "cuenta-1", cuentaContableId: "cta-contable-1" }),
  } as unknown as CuentaBancariaRepository;

  const conciliacionBancariaRepository = {
    listarAsientosYaConciliados: vi.fn().mockResolvedValue(opts.yaConciliados ?? new Set()),
    crearMuchas: vi.fn().mockImplementation(async (lineas) => lineas.map((l: unknown, i: number) => ({ id: `linea-${i}`, ...(l as object) }))),
  } as unknown as ConciliacionBancariaRepository;

  const asientoRepository = {
    listarMovimientosPorCuenta: vi.fn().mockResolvedValue(opts.movimientos ?? [movimiento()]),
  } as unknown as AsientoRepository;

  return { cuentaBancariaRepository, conciliacionBancariaRepository, asientoRepository };
}

describe("ImportarExtractoBancario", () => {
  it("matchea automaticamente una linea de ingreso contra un movimiento DEBE del mismo importe y fecha cercana", async () => {
    const mocks = buildMocks();
    const useCase = new ImportarExtractoBancario(
      mocks.cuentaBancariaRepository,
      mocks.conciliacionBancariaRepository,
      mocks.asientoRepository,
    );

    const resultado = await useCase.ejecutar(CONTEXT, {
      cuentaBancariaId: "cuenta-1",
      lineas: [{ fecha: new Date("2026-10-11"), descripcion: "Transferencia recibida", importe: 500 }],
    });

    expect(mocks.conciliacionBancariaRepository.crearMuchas).toHaveBeenCalledWith([
      expect.objectContaining({ asientoId: "asiento-1" }),
    ]);
    expect(resultado).toHaveLength(1);
  });

  it("una linea de egreso no matchea contra un movimiento DEBE aunque el importe coincida", async () => {
    const mocks = buildMocks({ movimientos: [movimiento({ lado: "DEBE" })] });
    const useCase = new ImportarExtractoBancario(
      mocks.cuentaBancariaRepository,
      mocks.conciliacionBancariaRepository,
      mocks.asientoRepository,
    );

    await useCase.ejecutar(CONTEXT, {
      cuentaBancariaId: "cuenta-1",
      lineas: [{ fecha: new Date("2026-10-11"), descripcion: "Pago a proveedor", importe: -500 }],
    });

    expect(mocks.conciliacionBancariaRepository.crearMuchas).toHaveBeenCalledWith([
      expect.objectContaining({ asientoId: null }),
    ]);
  });

  it("no matchea si la fecha esta fuera de la ventana de dias", async () => {
    const mocks = buildMocks({ movimientos: [movimiento({ fecha: new Date("2026-01-01") })] });
    const useCase = new ImportarExtractoBancario(
      mocks.cuentaBancariaRepository,
      mocks.conciliacionBancariaRepository,
      mocks.asientoRepository,
    );

    await useCase.ejecutar(CONTEXT, {
      cuentaBancariaId: "cuenta-1",
      lineas: [{ fecha: new Date("2026-10-11"), descripcion: "Transferencia recibida", importe: 500 }],
    });

    expect(mocks.conciliacionBancariaRepository.crearMuchas).toHaveBeenCalledWith([
      expect.objectContaining({ asientoId: null }),
    ]);
  });

  it("no reutiliza un asiento ya conciliado anteriormente", async () => {
    const mocks = buildMocks({ yaConciliados: new Set(["asiento-1"]) });
    const useCase = new ImportarExtractoBancario(
      mocks.cuentaBancariaRepository,
      mocks.conciliacionBancariaRepository,
      mocks.asientoRepository,
    );

    await useCase.ejecutar(CONTEXT, {
      cuentaBancariaId: "cuenta-1",
      lineas: [{ fecha: new Date("2026-10-11"), descripcion: "Transferencia recibida", importe: 500 }],
    });

    expect(mocks.conciliacionBancariaRepository.crearMuchas).toHaveBeenCalledWith([
      expect.objectContaining({ asientoId: null }),
    ]);
  });

  it("dos lineas candidatas al mismo importe no se asignan ambas al mismo asiento", async () => {
    const mocks = buildMocks({ movimientos: [movimiento({ asientoId: "asiento-1" })] });
    const useCase = new ImportarExtractoBancario(
      mocks.cuentaBancariaRepository,
      mocks.conciliacionBancariaRepository,
      mocks.asientoRepository,
    );

    await useCase.ejecutar(CONTEXT, {
      cuentaBancariaId: "cuenta-1",
      lineas: [
        { fecha: new Date("2026-10-11"), descripcion: "Transferencia 1", importe: 500 },
        { fecha: new Date("2026-10-11"), descripcion: "Transferencia 2 (duplicada)", importe: 500 },
      ],
    });

    const lineasInsertadas = (mocks.conciliacionBancariaRepository.crearMuchas as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    const matcheadas = lineasInsertadas.filter((l: { asientoId: string | null }) => l.asientoId !== null);
    expect(matcheadas).toHaveLength(1);
  });
});
