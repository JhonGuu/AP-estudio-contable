import { describe, expect, it } from "vitest";
import { aplicacionCoincideConTotal, mediosCoincidenConTotal, type NuevoCobro } from "./Cobro.js";

function buildCobro(overrides: Partial<NuevoCobro> = {}): NuevoCobro {
  return {
    clienteId: "cli-1",
    fecha: new Date("2026-01-15"),
    importeTotal: 1000,
    medios: [{ medio: "CAJA", importe: 1000 }],
    comprobantes: [{ comprobanteId: "cmp-1", importeAplicado: 1000 }],
    ...overrides,
  };
}

describe("Cobro (dominio ventas, espejo de Pago) — mediosCoincidenConTotal", () => {
  it("acepta cuando la suma de medios iguala el total", () => {
    expect(mediosCoincidenConTotal(buildCobro())).toBe(true);
  });

  it("acepta combinando tarjeta + cheque de tercero (medios que antes se perdian en el asiento)", () => {
    const cobro = buildCobro({
      importeTotal: 2420,
      medios: [
        { medio: "TARJETA", importe: 1500 },
        { medio: "CHEQUE_TERCERO", importe: 920 },
      ],
    });
    expect(mediosCoincidenConTotal(cobro)).toBe(true);
  });

  it("no tiene retenciones (a diferencia de Pago) — la suma es solo de medios", () => {
    const cobro = buildCobro({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 1000 }] });
    expect(mediosCoincidenConTotal(cobro)).toBe(true);
    expect((cobro as unknown as { retenciones?: unknown }).retenciones).toBeUndefined();
  });

  it("rechaza cuando los medios no alcanzan el total", () => {
    const cobro = buildCobro({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 900 }] });
    expect(mediosCoincidenConTotal(cobro)).toBe(false);
  });

  it("tolera diferencias de redondeo menores al epsilon (0.005)", () => {
    const cobro = buildCobro({ importeTotal: 1000, medios: [{ medio: "CAJA", importe: 999.997 }] });
    expect(mediosCoincidenConTotal(cobro)).toBe(true);
  });
});

describe("Cobro (dominio ventas) — aplicacionCoincideConTotal", () => {
  it("acepta cuando la aplicacion a comprobantes agota el total del cobro", () => {
    expect(aplicacionCoincideConTotal(buildCobro())).toBe(true);
  });

  it("acepta aplicacion parcial repartida entre varios comprobantes (cobro en partes)", () => {
    const cobro = buildCobro({
      importeTotal: 1000,
      comprobantes: [
        { comprobanteId: "cmp-1", importeAplicado: 300 },
        { comprobanteId: "cmp-2", importeAplicado: 700 },
      ],
    });
    expect(aplicacionCoincideConTotal(cobro)).toBe(true);
  });

  it("rechaza si la aplicacion excede el total del cobro", () => {
    const cobro = buildCobro({
      importeTotal: 1000,
      comprobantes: [{ comprobanteId: "cmp-1", importeAplicado: 1200 }],
    });
    expect(aplicacionCoincideConTotal(cobro)).toBe(false);
  });
});
